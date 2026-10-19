(ns metabase.embedding-rest.analytics-assistant-test
  (:require
   [buddy.sign.jwt :as jwt]
   [clj-http.client :as http]
   [clojure.string :as str]
   [clojure.test :refer :all]
   [metabase.public-sharing.analytics-assistant :as assistant]
   [metabase.test :as mt]
   [metabase.util.json :as json]
   [metabase.util.random :as u.random])
  (:import
   (java.io ByteArrayInputStream)))

(set! *warn-on-reflection* true)

(def ^:private workflow-url
  "https://agent.thearena.ai/api/v2/workflows/cc23d5ce-dbae-4614-97be-f9840143a903/execute")

(deftest execute-body-includes-the-sim-contract-and-selected-tab
  (is (= {:input {:input "What changed?"
                  :conversationId "conv-1"
                  :files []
                  :public_uuid "42"
                  :embedUrl "https://mb.example/embed/dashboard/token"
                  :prompt "Revenue"
                  :selectedTabId 7}
          :stream true
          :selectedOutputs ["dashboardchat.content"]
          :includeThinking true
          :includeToolCalls false}
         (assistant/execute-body {:input "What changed?"
                                  :conversation-id "conv-1"
                                  :public-uuid "42"
                                  :embed-url "https://mb.example/embed/dashboard/token"
                                  :prompt "Revenue"
                                  :files []
                                  :selected-tab-id 7}))))

(defn- sign [secret dashboard-id]
  (jwt/sign {:resource {:dashboard dashboard-id}
             :params {}}
            secret))

(defn- assistant-request
  [status secret dashboard-id body]
  (mt/with-temporary-setting-values [enable-embedding-static true
                                     embedding-secret-key secret]
    (mt/user-http-request :crowberto :post status
                          (str "embed/dashboard/"
                               (sign secret dashboard-id)
                               "/analytics-assistant")
                          body)))

(deftest analytics-assistant-requires-the-contract-fields
  (let [secret (u.random/secure-hex 32)]
    (mt/with-temp [:model/Dashboard dash {:enable_embedding true}]
      (is (= "input is required"
             (:error (assistant-request 400 secret (:id dash)
                                        {:conversationId "conv-1"})))))))

(deftest analytics-assistant-posts-the-prod-workflow
  (let [secret (u.random/secure-hex 32)
        captured (atom nil)]
    (mt/with-temp [:model/Dashboard dash {:enable_embedding true}]
      (with-redefs [http/post (fn [url opts]
                                (reset! captured {:url url :opts opts})
                                {:status 200
                                 :body (ByteArrayInputStream.
                                        (.getBytes "data: {\"blockId\":\"dashboardchat.content\",\"chunk\":\"ok\"}\n\n"
                                                   "UTF-8"))})]
        (let [body (assistant-request 200 secret (:id dash)
                                      {:input "What changed?"
                                       :conversationId "conv-1"
                                       :public_uuid "999999"
                                       :embedUrl "https://mb.example/embed/dashboard/abc"
                                       :prompt "Revenue"
                                       :files []
                                       :selectedTabId 7})]
          (is (str/includes? body "dashboardchat.content"))
          (is (= workflow-url (:url @captured)))
          (is (not (str/includes? (:url @captured) "dev-agent")))
          (is (not (str/includes? (:url @captured) "test-agent")))
          (is (= "agent-events-v1" (get-in @captured [:opts :headers "X-Sim-Stream-Protocol"])))
          (is (str/starts-with? (get-in @captured [:opts :headers "X-API-Key"]) "sk-sim-"))
          (is (= {:input {:input "What changed?"
                          :conversationId "conv-1"
                          :files []
                          :public_uuid (str (:id dash))
                          :embedUrl "https://mb.example/embed/dashboard/abc"
                          :prompt "Revenue"
                          :selectedTabId 7}
                  :stream true
                  :selectedOutputs ["dashboardchat.content"]
                  :includeThinking true
                  :includeToolCalls false}
                 (json/decode (:body (:opts @captured)) true))))))))
