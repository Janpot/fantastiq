local key_config,
      key_nextId,
      key_inactive,
      key_delayed,
      key_jobDetails,
      key_index = unpack(KEYS)

local timestamp,
      priority,
      runAt = unpack(ARGV)
local jobDatas = {select(4, unpack(ARGV))}

timestamp = tonumber(timestamp)
runAt = tonumber(runAt)
priority = tonumber(priority)

local unique = fantastiq.getConfig(key_config, 'unique')

local jobKeys = {}
if unique then
  local uniqueKey = fantastiq.getConfig(key_config, 'uniqueKey')
  if uniqueKey then
    for i, jobData in ipairs(jobDatas) do
      local parsed = cjson.decode(jobData)
      if type(parsed) ~= 'table' then
        return redis.error_reply('Job requires a key')
      end

      local key = parsed[uniqueKey]

      if not key then
        return redis.error_reply('Job requires a key')
      end

      if type(key) ~= 'string' then
        return redis.error_reply('Invalid key')
      end

      jobKeys[i] = key
    end
  else
    for i, jobData in ipairs(jobDatas) do
      jobKeys[i] = jobData
    end
  end
end

local jobIds = {}
for i, jobData in ipairs(jobDatas) do
  local existing

  if unique then
    existing = redis.call('HGET', key_index, jobKeys[i])
  end

  if existing then
    jobIds[i] = existing
  else
    local nextId = redis.call('INCR', key_nextId)
    local jobId = string.format('%013X', nextId)

    if jobKeys[i] then
      redis.call('HSET', key_index, jobKeys[i], jobId)
    end

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
end

return jobIds
