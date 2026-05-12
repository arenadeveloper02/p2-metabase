(ns metabase.dashboard-pdf.jsreport
  "Server-side dashboard PDF rendering via jsreport (chrome-pdf), invoked as a Node subprocess.

  Requires Node.js (see Metabase `package.json` `engines.node`) and `yarn install` at the application root so
  `node_modules` contains `@jsreport/jsreport-core` and `@jsreport/jsreport-chrome-pdf`.

  Environment:
  - `MB_NODE_BINARY` — path to `node` (default: `\"node\"` on PATH)
  - `MB_JSREPORT_DASHBOARD_PDF_SCRIPT` — path to `jsreport-dashboard-pdf.cjs` (default: `<user.dir>/bin/jsreport-dashboard-pdf.cjs`)
  - `MB_JSREPORT_DASHBOARD_PDF_TIMEOUT_MS` — subprocess timeout (default: 180000)"
  (:require
   [clojure.java.io :as io]
   [clojure.string :as str]
   [metabase.util.log :as log])
  (:import
   (java.io ByteArrayInputStream File)
   (java.lang ProcessBuilder ProcessBuilder$Redirect)
   (java.nio.charset StandardCharsets)
   (java.util.concurrent TimeUnit)
   (org.apache.commons.io IOUtils)))

(set! *warn-on-reflection* true)

(def ^:private default-timeout-ms
  (long (* 3 60 1000)))

(def ^:private max-html-chars
  "Rough guardrail to avoid very large payloads tying up Chrome."
  (* 40 1024 1024))

(defn- node-binary
  []
  (or (not-empty (System/getenv "MB_NODE_BINARY"))
      "node"))

(defn- script-file
  ^File []
  (if-let [p (not-empty (System/getenv "MB_JSREPORT_DASHBOARD_PDF_SCRIPT"))]
    (File. ^String p)
    (File. (System/getProperty "user.dir") "bin/jsreport-dashboard-pdf.cjs")))

(defn- timeout-ms
  []
  (or (some-> (System/getenv "MB_JSREPORT_DASHBOARD_PDF_TIMEOUT_MS") parse-long)
      default-timeout-ms))

(defn html->pdf-bytes!
  "Write `html` to a temp file, run the jsreport Node script, return PDF bytes, delete the temp file."
  ^bytes [^String html]
  (when (> (count html) max-html-chars)
    (throw (ex-info "Dashboard export HTML exceeds maximum allowed size"
                    {:max-chars max-html-chars :actual (count html)})))
  (let [script (script-file)]
    (when-not (.exists script)
      (throw (ex-info "jsreport dashboard PDF script not found"
                      {:path (.getAbsolutePath script)})))
    (let [html-file (File/createTempFile "metabase-dash-export-" ".html")]
      (try
        (io/copy (.getBytes html StandardCharsets/UTF_8) html-file)
        (let [pb (doto (ProcessBuilder. [(node-binary) (.getAbsolutePath ^File script) (.getAbsolutePath html-file)])
              _ (.redirectErrorStream pb false)
              _ (.redirectInput pb ProcessBuilder$Redirect/PIPE)
              _ (.redirectOutput pb ProcessBuilder$Redirect/PIPE)
              _ (.redirectError pb ProcessBuilder$Redirect/PIPE)
              proc (.start pb)
              stdout (future (IOUtils/toByteArray ^java.io.InputStream (.getInputStream proc)))
              stderr (future (slurp (.getErrorStream proc) :encoding "UTF-8"))
              finished? (.waitFor proc (timeout-ms) TimeUnit/MILLISECONDS)]
          (when-not finished?
            (.destroyForcibly proc)
            (throw (ex-info "jsreport dashboard PDF subprocess timed out"
                            {:timeout-ms (timeout-ms)})))
          (when-not (zero? (.exitValue proc))
            (throw (ex-info "jsreport dashboard PDF subprocess failed"
                            {:exit-code (.exitValue proc)
                             :stderr    @stderr})))
          (when-let [err (not-empty (str/trim @stderr))]
            (log/debugf "jsreport stderr: %s" err))
          @stdout)
        (finally
          (when (.exists html-file)
            (.delete ^File html-file))))))

(defn html->pdf-response
  "Ring response map for a PDF download."
  [filename ^String html]
  (let [^bytes pdf (html->pdf-bytes! html)
        safe-name (str/replace (or filename "dashboard.pdf") #"[^\w.\-]+" "_")]
    {:status  200
     :headers {"Content-Type"        "application/pdf"
               "Content-Disposition" (format "attachment; filename=\"%s\"" safe-name)
               "Cache-Control"         "no-store"}
     :body    (ByteArrayInputStream. pdf)}))
