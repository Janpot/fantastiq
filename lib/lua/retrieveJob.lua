local key_inactive,
      key_active,
      key_config,
      key_lastRetrieve,
      key_jobDetails = unpack(KEYS)

local timestamp,
      unthrottle = unpack(ARGV)

timestamp = tonumber(timestamp)


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

  local jobDetails = fantastiq.getJobDetails(key_jobDetails, jobId)
  jobDetails['state'] = 'active'
  jobDetails['started'] = timestamp
  jobDetails['attempts'] = jobDetails['attempts'] + 1
  fantastiq.setJobDetails(key_jobDetails, jobId, jobDetails)

  jobData = jobDetails['data']

  -- an item was retrieved so prepare throttle for the next
  redis.call('SET', key_lastRetrieve, timestamp)
else
  waitTime = 0
end



return {jobIds, jobData, waitTime}
