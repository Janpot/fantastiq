local key_nextId,
      key_inactive,
      key_delayed,
      key_jobDetails = unpack(KEYS)

local timestamp,
      priority,
      runAt = unpack(ARGV)
local jobDatas = {select(4, unpack(ARGV))}

timestamp = tonumber(timestamp)
runAt = tonumber(runAt)
priority = tonumber(priority)

local jobIds = {}
for i, jobData in ipairs(jobDatas) do
  local nextId = redis.call('INCR', key_nextId)
  local jobId = string.format('%013X', nextId)
  jobIds[i] = jobId

  local jobDetails = {
    id = jobId,
    priority = priority,
    data = jobData,
    created = timestamp,
    attempts = 0
  }

  if runAt > timestamp then
    redis.call('ZADD', key_delayed, runAt, jobId)
    jobDetails['state'] = 'delayed'
    jobDetails['runAt'] = runAt
  else
    redis.call('ZADD', key_inactive, priority, jobId)
    jobDetails['state'] = 'inactive'
  end

  fantastiq.setJobDetails(key_jobDetails, jobId, jobDetails)
end

return jobIds
