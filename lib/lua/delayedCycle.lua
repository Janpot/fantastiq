local key_delayed,
      key_inactive,
      key_jobDetails,
      key_tmp = unpack(KEYS)

local timestamp = unpack(ARGV)

timestamp = tonumber(timestamp)



redis.call('DEL', key_tmp)
redis.call('ZINTERSTORE', key_tmp, 1, key_delayed)
redis.call('ZREMRANGEBYSCORE', key_tmp, timestamp, '+inf')
local expired = redis.call('ZRANGE', key_tmp, 0, -1)

for i, jobId in ipairs(expired) do
  redis.call('ZREM', key_delayed, jobId)
  local jobDetails = fantastiq.getJobDetails(key_jobDetails, jobId)
  local priority = jobDetails['priority']
  redis.call('ZADD', key_inactive, priority, jobId)
  jobDetails['state'] = 'inactive'
  jobDetails['runAt'] = nil
  fantastiq.setJobDetails(key_jobDetails, jobId, jobDetails)
end



return #expired
