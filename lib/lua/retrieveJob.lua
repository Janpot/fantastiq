local key_inactive,
      key_active,
      key_jobState,
      key_started,
      key_jobData,
      key_jobAttempts,
      key_config,
      key_lastRetrieve = unpack(KEYS)

local timestamp,
      unthrottle = unpack(ARGV)


if unthrottle == 'true' then
  redis.call('DEL', key_lastRetrieve)
end

local throttleTime = tonumber(redis.call('HGET', key_config, 'throttle'))
local waitTime = 0

if throttleTime then
  waitTime = throttleTime

  local lastRetrieveTime = redis.call('GET', key_lastRetrieve)
  if lastRetrieveTime then
    local elapsedTime = timestamp - lastRetrieveTime
    if elapsedTime < throttleTime then
      -- throttled
      return {{}, 'null', throttleTime - elapsedTime}
    end
  end
end


local jobIds = redis.call('ZRANGE', key_inactive, 0, 0)
local jobId = jobIds[1]
local jobData = 'null'

if jobId then
  redis.call('ZREM', key_inactive, jobId)
  redis.call('ZADD', key_active, timestamp, jobId)
  redis.call('HSET', key_jobState, jobId, 'active')
  redis.call('HSET', key_started, jobId, timestamp)
  redis.call('HINCRBY', key_jobAttempts, jobId, 1)

  jobData = redis.call('HGET', key_jobData, jobId)

  -- an item was retrieved so prepare throttle for the next
  redis.call('SET', key_lastRetrieve, timestamp)
else
  waitTime = 0
end



return {jobIds, jobData, waitTime}
