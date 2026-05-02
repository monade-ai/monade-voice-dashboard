#sample billing data
{
  "assistant_id": "95cff13a-cf46-414a-a122-7eb42ac9180a",
  "credits_used": 1.5,
  "call_direction": "outbound",
  "cost_per_minute": 1,
  "recording_enabled": true,
  "settlement_status": "ok",
  "recording_surcharge_total": 0.1
}

not all feilds are in this only call direction,cost per min, recording_surcharge,credits_used 

# sample entry from db
{
  "source": "vobiz",
  "status": "completed",
  "duration": 19,
  "end_time": "2026-05-01T12:12:39Z",
  "direction": "outbound",
  "fetched_at": "2026-05-01T12:13:44.683Z",
  "hangup_cause": "NORMAL_CLEARING"
}

#from vobiz docs

status	string	"completed", "no-answer", "busy", "failed"

#also from docs mapping
Hangup Causes
When reviewing your SIP call logs, you may encounter various error and failure statuses. Understanding these statuses is essential for troubleshooting SIP connections, routing issues, and endpoint configurations. The table below describes common SIP error logs and what they indicate:

Status Code	Description / Cause
NORMAL_CLEARING	- The call was cleared normally by one of the parties hanging up. This is a standard end-of-call status.
USER_BUSY -	The called party is busy (e.g., already on another call or declined the call).
NO_ANSWER -	The called party did not answer the call within the specified timeout period.
ORIGINATOR_CANCEL -	The caller (originator) hung up or cancelled the call before it could be answered.
CALL_REJECTED -	The call was explicitly rejected, potentially due to blocking rules, spam filtering, or the destination refusing the connection.
REJECTED -	A general rejection status, often occurring when the SIP endpoint refuses the incoming INVITE.
INVALID_NUMBER - The dialed number format is incorrect, invalid, or does not exist.
UNALLOCATED_NUMBER - The dialed number is formally valid but is not currently allocated or assigned to any active subscriber.
SERVICE_UNAVAILABLE - The destination service or endpoint is temporarily completely unavailable (e.g., SIP 503 error).
SERVER_ERROR - An internal server error occurred while attempting to process or route the SIP call.
MEDIA_TIMEOUT - The call was disconnected because no RTP media packets were received for an extended period, suggesting a firewall or network dropout issue.
PROTOCOL_ERROR - A fundamental SIP protocol violation or malformed SIP message occurred during call setup.
NETWORK_OUT_OF_ORDER - A severe network failure prevented the call from being routed to its destination.
DESTINATION_OUT_OF_ORDER - The specific destination endpoint or PBX cannot physically accept the call, often indicating an offline server.
NORMAL_TEMPORARY_FAILURE - A generic temporary failure in routing the call. Re-attempting the call might succeed.
SWITCH_CONGESTION	The telephone network or SIP switch is experiencing high traffic and cannot handle the required capacity at this moment.
UNKNOWN	An error occurred that could not be mapped to any standard SIP error or ISUP release cause code.


# we dont need to show so many things in the frontend , our end users are not so technical , we only need call picked , not picked , user busy , if failure then what was the cause of it

