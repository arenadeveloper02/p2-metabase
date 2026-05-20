/**
 * Query parameter passed on embedded dashboard URLs so Metabase can persist the
 * selected tab for an external application user.
 *
 * Example iframe src:
 * /embed/dashboard/{jwt}?mb_external_user_id=user-123#bordered=false&titled=false
 */
export const EMBED_EXTERNAL_USER_ID_QUERY_PARAM = "mb_external_user_id";
