local key_inactive,
      key_active,
      key_failed,
      key_jobDetails,
      key_config = unpack(KEYS)

local timestamp,
      defaultTimeout = unpack(ARGV)

timestamp = tonumber(timestamp)

redis.call('HSETNX', key_config, 'timeout', defaultTimeout)
local timeout = redis.call('HGET', key_config, 'timeout')


local timeoutTime = timestamp - timeout
local count = 0

local jobIds = redis.call('ZRANGEBYSCORE', key_active, 0, timeoutTime)
local allowedAttempts = tonumber(redis.call('HGET', key_config, 'attempts')) or 1

for i, jobId in ipairs(jobIds) do
  redis.call('ZREM', key_active, jobId)

  local jobDetails = fantastiq.getJobDetails(key_jobDetails, jobId)

  local jobAttempts = jobDetails['attempts']
  if jobAttempts < allowedAttempts then
    local priority = jobDetails['priority']
    redis.call('ZADD', key_inactive, priority, jobId)
    jobDetails['state'] = 'inactive'
    jobDetails['started'] = nil
  else
    redis.call('ZADD', key_failed, timestamp, jobId)
    jobDetails['state'] = 'failed'
    jobDetails['error'] = '{\"message\":\"Job timed out\"}'
    jobDetails['finished'] = timestamp
  end

  fantastiq.setJobDetails(key_jobDetails, jobId, jobDetails)
end


return #jobIds
