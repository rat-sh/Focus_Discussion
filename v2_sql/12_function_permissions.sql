-- Feature: least-privilege access to database RPCs
-- Depends-on: 02_profiles through 05_focus

REVOKE ALL ON FUNCTION handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION invite_code() FROM PUBLIC;
REVOKE ALL ON FUNCTION room_dto(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_room(text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION list_my_rooms() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION preview_room(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION join_room(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION search_people(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION list_friends() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION list_friend_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION send_friend_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION respond_friend_request(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION cancel_friend_request(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION remove_friend(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION rollup_daily_focus(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION weekly_stats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION create_room(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION list_my_rooms() TO authenticated;
GRANT EXECUTE ON FUNCTION preview_room(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION join_room(text) TO authenticated;
GRANT EXECUTE ON FUNCTION search_people(text) TO authenticated;
GRANT EXECUTE ON FUNCTION list_friends() TO authenticated;
GRANT EXECUTE ON FUNCTION list_friend_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION send_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION respond_friend_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_friend_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION remove_friend(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION rollup_daily_focus(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION weekly_stats() TO authenticated;
