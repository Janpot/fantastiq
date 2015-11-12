local key_lastRetrieve,
      key_lastRetrieveId = unpack(KEYS)

local timestamp,
      unthrottle,
      random = unpack(ARGV)

timestamp = tonumber(timestamp)
random = tonumber(random)
unthrottle = cjson.decode(unthrottle)

if unthrottle then
  if type(unthrottle) == 'string' then
    local lastRetrieveId = redis.call('GET', key_lastRetrieveId)
    if unthrottle == lastRetrieveId then
      redis.call('DEL', key_lastRetrieve)
    end
  else
    redis.call('DEL', key_lastRetrieve)
  end
end

local throttleTime = fantastiq.getConfig('throttle')
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

local index = 0

if random > 0 then
  local minPriority = redis.call('ZRANGEBYSCORE', fantastiq.key_inactive, '-inf', '+inf', 'WITHSCORES', 'LIMIT', 0, 1)[2]
  if minPriority then
    local lowestPrioCount = redis.call('ZCOUNT', fantastiq.key_inactive, '-inf', minPriority)
    index = math.floor(random * lowestPrioCount)
  end
end


local jobIds = redis.call('ZRANGE', fantastiq.key_inactive, index, index)
local jobId = jobIds[1]
local jobData = 'null'

if jobId then
  redis.call('ZREM', fantastiq.key_inactive, jobId)
  redis.call('ZADD', fantastiq.key_active, timestamp, jobId)

  local jobDetails = fantastiq.getJobDetails(jobId)
  jobDetails['state'] = 'active'
  jobDetails['started'] = timestamp
  jobDetails['attempts'] = jobDetails['attempts'] + 1
  fantastiq.setJobDetails(jobId, jobDetails)

  jobData = jobDetails['data']

  -- an item was retrieved so prepare throttle for the next
  redis.call('SET', key_lastRetrieve, timestamp)
  redis.call('SET', key_lastRetrieveId, jobId)
else
  waitTime = 0
end



return {jobIds, jobData, waitTime}
