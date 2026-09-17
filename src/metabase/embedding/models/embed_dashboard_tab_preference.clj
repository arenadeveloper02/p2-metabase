(ns metabase.embedding.models.embed-dashboard-tab-preference
  (:require
   [metabase.api.common :as api]
   [metabase.util.i18n :refer [tru]]
   [metabase.util.malli :as mu]
   [metabase.util.malli.schema :as ms]
   [methodical.core :as methodical]
   [toucan2.core :as t2]))

(set! *warn-on-reflection* true)

(methodical/defmethod t2/table-name :model/EmbedDashboardTabPreference [_model]
  :embed_dashboard_tab_preference)

(doto :model/EmbedDashboardTabPreference
  (derive :metabase/model)
  (derive :hook/timestamped?))

(mu/defn- valid-tab-for-dashboard?
  [dashboard-id :- ms/PositiveInt
   tab-id       :- ms/PositiveInt]
  (t2/exists? :model/DashboardTab
              :dashboard_id dashboard-id
              :id           tab-id
              :is_removed   false))

(mu/defn get-preference
  "Return saved tab id for an external user and dashboard, or nil."
  [external-user-id :- ms/NonBlankString
   dashboard-id     :- ms/PositiveInt]
  (:tab_id (t2/select-one [:model/EmbedDashboardTabPreference :tab_id]
                          :external_user_id external-user-id
                          :dashboard_id dashboard-id)))

(mu/defn set-preference!
  "Upsert the last selected tab for an external user and dashboard."
  [external-user-id :- ms/NonBlankString
   dashboard-id     :- ms/PositiveInt
   tab-id           :- ms/PositiveInt]
  (api/check-400 (valid-tab-for-dashboard? dashboard-id tab-id)
                 (tru "Invalid tab for dashboard"))
  (let [row {:external_user_id external-user-id
             :dashboard_id     dashboard-id
             :tab_id           tab-id}]
    (if (t2/exists? :model/EmbedDashboardTabPreference
                   :external_user_id external-user-id
                   :dashboard_id dashboard-id)
      (t2/update! :model/EmbedDashboardTabPreference
                  :external_user_id external-user-id
                  :dashboard_id dashboard-id
                  {:tab_id tab-id})
      (t2/insert! :model/EmbedDashboardTabPreference row))
    {:tab_id tab-id}))
