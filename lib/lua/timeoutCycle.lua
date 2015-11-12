local key_index = unpack(KEYS)

local timestamp,
      defaultTimeout,
      serializedError = unpack(ARGV)

timestamp = tonumber(timestamp)

redis.call('HSETNX', fantastiq.key_config, 'timeout', defaultTimeout)
local timeout = fantastiq.getConfig('timeout')


local timeoutTime = timestamp - timeout
local count = 0

local jobIds = redis.call('ZRANGEBYSCORE', fantastiq.key_active, 0, timeoutTime)
local allowedAttempts = fantastiq.getConfig('attempts') or 1

for i, jobId in ipairs(jobIds) do
  fantastiq.acknowledge(
    key_index,
    timestamp,
    jobId,
    serializedError,
    nil -- no result
  )
end


return #jobIds
