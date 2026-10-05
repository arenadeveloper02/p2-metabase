(ns metabase.lib.pivot
  "Helpers around the MBQL 5 `:pivot` stage clause: the synthetic `pivot-grouping` column it implies, and small
  predicates and resolvers over the clause.

  BE-only. Not exported from [[metabase.lib.js]] — the FE never constructs a `:pivot` clause."
  (:refer-clojure :exclude [mapv])
  (:require
   [medley.core :as m]
   [metabase.lib.options :as lib.options]
   [metabase.lib.schema :as lib.schema]
   [metabase.lib.util :as lib.util]
   [metabase.util :as u]
   [metabase.util.malli :as mu]
   [metabase.util.performance :refer [mapv]]))

(def pivot-grouping-column-name
  "Name of the synthetic `pivot-grouping` column added to pivot query results."
  "pivot-grouping")

(def pivot-grouping-column-metadata
  "Lib-shaped column metadata for the synthetic `pivot-grouping` column spliced into a pivot query's returned columns."
  {:lib/type   :metadata/column
   :name       pivot-grouping-column-name
   :base-type  :type/Integer
   :lib/source :source/pivot-grouping})

(mu/defn pivot :- [:maybe [:ref ::lib.schema/pivot]]
  "Return the `:pivot` clause on `query`'s last stage, or nil if there isn't one."
  [query :- ::lib.schema/query]
  (:pivot (lib.util/query-stage query -1)))

(mu/defn has-pivot? :- :boolean
  "True if the query carries a `:pivot` clause on its last stage."
  [query :- ::lib.schema/query]
  (some? (pivot query)))

(mu/defn with-pivot :- ::lib.schema/query
  "Attach `pivot-clause` to `query`'s last stage, replacing any existing `:pivot`. A nil `pivot-clause`
  removes the `:pivot`."
  [query        :- ::lib.schema/query
   pivot-clause :- [:maybe [:ref ::lib.schema/pivot]]]
  (lib.util/update-query-stage query -1 u/assoc-dissoc :pivot pivot-clause))

(defn read-show-flag
  "Return the value in `m` under the first key in `ks` that is present, or `true` if none are."
  [m & ks]
  (if-let [k (m/find-first #(contains? m %) ks)]
    (get m k)
    true))

(def ^:private subtotals-keys
  [:pivot.show_subtotals "pivot.show_subtotals" :show-subtotals :show_subtotals])

(def ^:private grand-totals-keys
  [:pivot.show_grand_totals "pivot.show_grand_totals" :show-grand-totals :show_grand_totals])

(def ^:private legacy-column-totals-keys
  [:pivot.show_column_totals "pivot.show_column_totals" :show-column-totals :show_column_totals])

(defn- has-any-key? [m ks]
  (boolean (m/find-first #(contains? m %) ks)))

(defn read-totals-visibility
  "Return `{:show-subtotals bool, :show-grand-totals bool}` from a viz-settings, pivot-options, or `:pivot` clause map.

  Prefers the split keys (`show-subtotals` / `show-grand-totals`, including `pivot.show_*` viz-settings forms).
  When a split key is absent, that side falls back to the legacy combined `show-column-totals` flag (default `true`).
  When neither split key is present, both values follow the legacy flag."
  [m]
  (let [legacy   (apply read-show-flag m legacy-column-totals-keys)
        has-sub? (has-any-key? m subtotals-keys)
        has-grand? (has-any-key? m grand-totals-keys)]
    {:show-subtotals    (if has-sub?
                          (apply read-show-flag m subtotals-keys)
                          legacy)
     :show-grand-totals (if has-grand?
                          (apply read-show-flag m grand-totals-keys)
                          legacy)}))

(defn splice-pivot-grouping
  "Insert [[pivot-grouping-column-metadata]] into `cols` immediately after the leading run of breakout columns.
  Returns a vector."
  [cols]
  (let [[breakouts rest-cols] (split-with :lib/breakout? cols)]
    (into [] cat [breakouts [pivot-grouping-column-metadata] rest-cols])))

(defn- resolve-breakout-uuids [query uuids axis]
  (let [by-uuid (into {}
                      (map (juxt lib.options/uuid identity))
                      (:breakout (lib.util/query-stage query -1)))]
    (mapv (fn [breakout-id]
            (or (by-uuid breakout-id)
                (throw (ex-info (str ":pivot " (name axis) " references unknown breakout uuid " (pr-str breakout-id))
                                {:axis axis, :uuid breakout-id, :known-uuids (set (keys by-uuid))}))))
          uuids)))

(mu/defn pivot-rows :- [:maybe [:sequential :any]]
  "Return the breakout clauses corresponding to the last stage's `:pivot :rows`, in `:rows` order. Throws if any UUID
  does not resolve."
  [query :- ::lib.schema/query]
  (when-let [rows (-> query (lib.util/query-stage -1) :pivot :rows)]
    (resolve-breakout-uuids query rows :rows)))

(mu/defn pivot-columns :- [:maybe [:sequential :any]]
  "Return the breakout clauses corresponding to the last stage's `:pivot :columns`. See [[pivot-rows]]."
  [query :- ::lib.schema/query]
  (when-let [columns (-> query (lib.util/query-stage -1) :pivot :columns)]
    (resolve-breakout-uuids query columns :columns)))
