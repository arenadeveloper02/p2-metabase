(ns metabase.dashboards.models.dashboard-embed-user-tab
  "Persist last-selected dashboard tab for static embeds, per external application user."
  (:require
   [clojure.string :as str]
   [metabase.api.common :as api]
   [metabase.embedding-rest.api.common :as api.embed.common]
   [metabase.util.i18n :refer [tru]]
   [metabase.util.malli :as mu]
   [metabase.util.malli.schema :as ms]
   [methodical.core :as methodical]
   [toucan2.core :as t2]))

(methodical/defmethod t2/table-name :model/DashboardEmbedUserTab [_model]
  :dashboard_embed_user_tab)

(doto :model/DashboardEmbedUserTab
  (derive :metabase/model)
  (derive :hook/timestamped?))

(defn external-user-id-from-token
  "Read the external application user id from an unsigned embed JWT. Supports `user_id` or `user-id` keys."
  [unsigned-token]
  (or (get unsigned-token :user_id)
      (get unsigned-token :user-id)
      (throw (ex-info (tru "Token is missing value for keypath user_id")
                      {:status-code 400}))))

(defn- validate-tab-for-dashboard!
  [dashboard-id tab-id]
  (let [tab (t2/select-one :model/DashboardTab :id tab-id :dashboard_id dashboard-id)]
    (api/check-404 tab)
    (api/check (not= false (:is_shown tab))
               [400 (tru "Cannot select a hidden tab.")])
    tab))

(mu/defn upsert-embed-user-tab! :- nil?
  "Save the last selected tab for a static embed viewer. Only applies when embedding is enabled on the dashboard."
  [dashboard-id       :- ms/PositiveInt
   external-user-id   :- ms/NonBlankString
   dashboard-tab-id   :- ms/PositiveInt]
  (api.embed.common/check-embedding-enabled-for-dashboard dashboard-id)
  (validate-tab-for-dashboard! dashboard-id dashboard-tab-id)
  (let [external-user-id (str/trim external-user-id)
        row              {:dashboard_id       dashboard-id
                          :external_user_id   external-user-id
                          :dashboard_tab_id   dashboard-tab-id}]
    (if-let [existing (t2/select-one :model/DashboardEmbedUserTab
                                    :dashboard_id dashboard-id
                                    :external_user_id external-user-id)]
      (t2/update! :model/DashboardEmbedUserTab (:id existing) (select-keys row [:dashboard_tab_id]))
      (t2/insert! :model/DashboardEmbedUserTab row)))
  nil)

(mu/defn create-tab-slug :- [:maybe :string]
  "Build a tab slug matching the frontend `createTabSlug` format, e.g. `106-weekly-summary`."
  [tab-id   :- ms/PositiveInt
   tab-name :- :string]
  (str tab-id "-" (-> tab-name str/lower-case (str/split #"\s+") (->> (str/join "-")))))

(mu/defn get-embed-user-tab
  "Return `{:tab_id ... :tab_slug ...}` for the user's last selected tab, or nil if none or tab no longer valid."
  [dashboard-id     :- ms/PositiveInt
   external-user-id :- ms/NonBlankString]
  (api.embed.common/check-embedding-enabled-for-dashboard dashboard-id)
  (when-let [{:keys [dashboard_tab_id]} (t2/select-one :model/DashboardEmbedUserTab
                                                       :dashboard_id dashboard-id
                                                       :external_user_id (str/trim external-user-id))]
    (when-let [tab (t2/select-one :model/DashboardTab
                                   :id dashboard_tab_id
                                   :dashboard_id dashboard-id)]
      (when (not= false (:is_shown tab))
        {:tab_id   (:id tab)
         :tab_slug (create-tab-slug (:id tab) (:name tab))}))))
