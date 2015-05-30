local key_nextId,
      key_inactive,
      key_delayed,
      key_jobState,
      key_jobPriority,
      key_jobData,
      key_jobRunAt,
      key_jobCreated = unpack(KEYS)

local timestamp,
      priority,
      runAt = unpack(ARGV)
local jobDatas = {select(4, unpack(ARGV))}

local jobIds = {}
for i, jobData in ipairs(jobDatas) do
  local nextId = redis.call('INCR', key_nextId)
  local jobId = string.format('%013X', nextId)
  jobIds[i] = jobId

  if runAt > timestamp then
    redis.call('ZADD', key_delayed, runAt, jobId)
    redis.call('HSET', key_jobState, jobId, 'delayed')
    redis.call('HSET', key_jobRunAt, jobId, runAt)
  else
    redis.call('ZADD', key_inactive, priority, jobId)
    redis.call('HSET', key_jobState, jobId, 'inactive')
  end


  redis.call('HSET', key_jobPriority, jobId, priority)
  redis.call('HSET', key_jobData, jobId, jobData)
  redis.call('HSET', key_jobCreated, jobId, timestamp)
end

return jobIds
