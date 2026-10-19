(ns metabase.public-sharing.analytics-assistant
  "Same-origin proxy for the public and embedded dashboard Arena analytics assistant.
  The browser posts here. This namespace posts to the prod Sim execute endpoint.
  The workspace API key stays in this process."
  (:require
   [clj-http.client :as http]
   [clojure.core.async :as a]
   [clojure.string :as str]
   [metabase.server.streaming-response :as streaming-response]
   [metabase.util.i18n :refer [tru]]
   [metabase.util.json :as json]
   [metabase.util.log :as log])
  (:import
   (java.io InputStream OutputStream)
   (java.util.concurrent Executors ThreadFactory)
   (java.util.concurrent.atomic AtomicInteger)))

(set! *warn-on-reflection* true)

(def ^:private assistant-origin "https://agent.thearena.ai")

(def ^:private workflow-id "cc23d5ce-dbae-4614-97be-f9840143a903")

(def ^:private output-name "dashboardchat.content")

(def request-body-schema
  "Client payload for the analytics assistant. Keys match the JSON body so the endpoint
  decoder keeps them; an undeclared body is an empty closed map and every key is stripped."
  [:map {:closed true}
   [:input {:optional true} [:maybe :string]]
   [:conversationId {:optional true} [:maybe :string]]
   [:embedUrl {:optional true} [:maybe :string]]
   [:prompt {:optional true} [:maybe :string]]
   [:files {:optional true} [:maybe [:sequential :string]]]
   [:selectedTabId {:optional true} [:maybe [:or :int :string]]]])

;;; Prod Sim workspace key. Never return this from an API or put it in frontend code.
(def ^:private api-key "sk-sim-rQiaHbgESEVoY7NHpKErdUJsZozsc8ZX")

(def ^:private stream-timeout-ms 110000)

(def ^:private connect-timeout-ms 10000)

(defonce ^:private stream-executor
  (delay
    (let [ids (AtomicInteger.)]
      (Executors/newCachedThreadPool
       (reify ThreadFactory
         (newThread [_ runnable]
           (doto (Thread. ^Runnable runnable)
             (.setDaemon true)
             (.setName (str "analytics-assistant-stream-" (.incrementAndGet ids))))))))))

(defn workflow-url
  "Prod Sim execute URL for the analytics assistant workflow."
  []
  (str assistant-origin "/api/v2/workflows/" workflow-id "/execute"))

(defn- trimmed-string
  [value]
  (when (string? value)
    (not-empty (str/trim value))))

(defn- tab-id
  "Selected dashboard tab id, or nil when the dashboard has no selection.
  Returns `:invalid` when the client sent some other type."
  [value]
  (cond
    (nil? value) nil
    (integer? value) value
    (string? value) (trimmed-string value)
    :else :invalid))

(defn execute-body
  "Sim execute body. Keys inside `:input` match the analytics assistant workflow, plus `selectedTabId`."
  [{:keys [input conversation-id public-uuid embed-url prompt files selected-tab-id]}]
  {:input {:input input
           :conversationId conversation-id
           :files (vec (or files []))
           :public_uuid public-uuid
           :embedUrl (or embed-url "")
           :prompt (or prompt "")
           :selectedTabId selected-tab-id}
   :stream true
   :selectedOutputs [output-name]
   :includeThinking true
   :includeToolCalls false})

(defn- request-fields
  "Pull the proxy fields off the client body. Returns a map, or an error string.
  `public_uuid` sent to Sim is the dashboard authorized by the link, not a client field."
  [dashboard-id body]
  (let [input (trimmed-string (:input body))
        conversation-id (trimmed-string (:conversationId body))
        embed-url (if (string? (:embedUrl body)) (str/trim (:embedUrl body)) "")
        prompt (if (string? (:prompt body)) (str/trim (:prompt body)) "")
        files (if (nil? (:files body)) [] (:files body))
        selected-tab-id (tab-id (:selectedTabId body))]
    (cond
      (nil? input) (tru "input is required")
      (nil? conversation-id) (tru "conversationId is required")
      (not (sequential? files)) (tru "files must be an array")
      (= selected-tab-id :invalid) (tru "selectedTabId must be an id or null")
      :else {:input input
             :conversation-id conversation-id
             :public-uuid (str dashboard-id)
             :embed-url embed-url
             :prompt prompt
             :files files
             :selected-tab-id selected-tab-id})))

(defn- copy-stream!
  [^InputStream in ^OutputStream out canceled-chan]
  (let [buffer (byte-array 8192)]
    (try
      (loop []
        (when (and (not (Thread/interrupted))
                   (nil? (a/poll! canceled-chan)))
          (let [read-count (.read in buffer)]
            (when (pos? read-count)
              (.write out buffer 0 read-count)
              (.flush out)
              (recur)))))
      (catch java.io.IOException _))))

(defn- error-response
  [status message]
  {:status status
   :body {:error message}})

(defn- upstream-error
  [status]
  (error-response (if (<= 400 status 599) status 502)
                  (tru "Analytics assistant workflow failed")))

(defn- open-upstream!
  [body]
  (http/post (workflow-url)
             {:headers {"Content-Type" "application/json"
                        "X-API-Key" api-key
                        "X-Sim-Stream-Protocol" "agent-events-v1"}
              :body (json/encode body)
              :as :stream
              :throw-exceptions false
              :conn-timeout connect-timeout-ms
              :socket-timeout stream-timeout-ms}))

(defn- stream-upstream
  [^InputStream upstream]
  (streaming-response/streaming-response
   {:content-type "text/event-stream; charset=utf-8"
    :headers {"Cache-Control" "no-cache"
              "X-Accel-Buffering" "no"}
    :executor @stream-executor}
   [os canceled-chan]
   (try
     (copy-stream! upstream os canceled-chan)
     (finally
       (.close upstream)))))

(defn respond!
  "Validate the client body, then stream the prod Sim execute response.
  `dashboard-id` is the dashboard authorized by the public link or embed token. Sim receives that id as `public_uuid`."
  [dashboard-id body]
  (let [fields (request-fields dashboard-id body)]
    (if (string? fields)
      (error-response 400 fields)
      (try
        (let [response (open-upstream! (execute-body fields))
              status (:status response)
              upstream (:body response)]
          (if (and (<= 200 status 299) (instance? InputStream upstream))
            (stream-upstream upstream)
            (do
              (when (instance? InputStream upstream)
                (.close ^InputStream upstream))
              (upstream-error status))))
        (catch Exception e
          (log/error "Analytics assistant proxy failed" (ex-message e))
          (error-response 502 (tru "Failed to run analytics assistant")))))))
