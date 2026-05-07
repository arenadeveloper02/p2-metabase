import { useEffect, useRef } from "react";

import { setParameterValue } from "metabase/dashboard/actions";
import {
  getDashboardId,
  getParameterValues,
  getParameters,
} from "metabase/dashboard/selectors";
import { useDispatch, useSelector } from "metabase/lib/redux";
import {
  getDateRangeDefaultPresetForParameter,
  getSerializedWeekDateRange,
} from "metabase/querying/parameters/utils/week-defaults";

export function useDefaultWeekDateRanges() {
  const dispatch = useDispatch();
  const dashboardId = useSelector(getDashboardId);
  const parameters = useSelector(getParameters);
  const parameterValues = useSelector(getParameterValues);
  const appliedDashboardIdRef = useRef<number | string | null>(null);

  useEffect(() => {
    if (!dashboardId || parameters.length === 0) {
      return;
    }

    if (appliedDashboardIdRef.current === dashboardId) {
      return;
    }

    const dateRangeParameters = parameters.filter(
      (parameter) => parameter.type === "date/range",
    );

    if (dateRangeParameters.length === 0) {
      appliedDashboardIdRef.current = dashboardId;
      return;
    }

    let didApply = false;

    for (const parameter of dateRangeParameters) {
      const currentValue = parameterValues?.[parameter.id];
      const hasExistingValue = !isEmptyParameterValue(currentValue);
      const hasDefault = !isEmptyParameterValue(parameter.default);

      if (hasExistingValue || hasDefault) {
        continue;
      }

      const preset = getDateRangeDefaultPresetForParameter(parameter);
      const serializedValue = getSerializedWeekDateRange(preset);

      dispatch(setParameterValue(parameter.id, serializedValue));
      didApply = true;
    }

    if (didApply || dateRangeParameters.length > 0) {
      appliedDashboardIdRef.current = dashboardId;
    }
  }, [dashboardId, parameters, parameterValues, dispatch]);
}

function isEmptyParameterValue(value: unknown): boolean {
  if (value == null) {
    return true;
  }
  if (typeof value === "string" && value === "") {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}
