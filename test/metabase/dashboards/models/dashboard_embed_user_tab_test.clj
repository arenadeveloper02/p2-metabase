(ns metabase.dashboards.models.dashboard-embed-user-tab-test
  (:require
   [clojure.test :refer :all]
   [metabase.dashboards.models.dashboard-embed-user-tab :as dashboard-embed-user-tab]
   [metabase.test :as mt]
   [toucan2.core :as t2]))

(deftest upsert-and-get-embed-user-tab-test
  (mt/with-temporary-setting-values [enable-embedding true]
    (mt/with-temp [:model/Dashboard dash {:enable_embedding true}]
      (mt/with-temp [:model/DashboardTab tab-1 {:dashboard_id (:id dash) :name "Tab 1" :position 0}
                     :model/DashboardTab tab-2 {:dashboard_id (:id dash) :name "Tab 2" :position 1}]
        (dashboard-embed-user-tab/upsert-embed-user-tab! (:id dash) "user-1" (:id tab-2))
        (is (= {:tab_id   (:id tab-2)
                :tab_slug "2-tab-2"}
               (dashboard-embed-user-tab/get-embed-user-tab (:id dash) "user-1")))
        (dashboard-embed-user-tab/upsert-embed-user-tab! (:id dash) "user-1" (:id tab-1))
        (is (= {:tab_id   (:id tab-1)
                :tab_slug "1-tab-1"}
               (dashboard-embed-user-tab/get-embed-user-tab (:id dash) "user-1")))
        (is (nil? (dashboard-embed-user-tab/get-embed-user-tab (:id dash) "user-2")))))))

(deftest create-tab-slug-test
  (is (= "106-weekly-summary"
         (dashboard-embed-user-tab/create-tab-slug 106 "Weekly Summary"))))
