local key_tmp = unpack(KEYS)

local timestamp = unpack(ARGV)

timestamp = tonumber(timestamp)



redis.call('DEL', key_tmp)
redis.call('ZINTERSTORE', key_tmp, 1, fantastiq.key_delayed)
redis.call('ZREMRANGEBYSCORE', key_tmp, timestamp, '+inf')
local expired = redis.call('ZRANGE', key_tmp, 0, -1)

for i, jobId in ipairs(expired) do
  redis.call('ZREM', fantastiq.key_delayed, jobId)
  local jobDetails = fantastiq.getJobDetails(jobId)
  jobDetails['runAt'] = nil
  fantastiq.updateJobState(jobDetails, 'inactive')
  fantastiq.setJobDetails(jobId, jobDetails)
end



return #expired
