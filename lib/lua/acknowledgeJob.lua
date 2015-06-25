local key_inactive,
      key_active,
      key_failed,
      key_completed,
      key_jobDetails,
      key_config = unpack(KEYS)

local timestamp,
      jobId,
      err,
      result = unpack(ARGV)

timestamp = tonumber(timestamp)

local keysRemoved = redis.call('ZREM', key_active, jobId)
if keysRemoved == 1 then
  local jobDetails = fantastiq.getJobDetails(key_jobDetails, jobId)
  if err == 'null' then
    redis.call('ZADD', key_completed, timestamp, jobId)
    jobDetails['state'] = 'completed'
    jobDetails['result'] = result
    jobDetails['finished'] = timestamp
  else
    local allowedAttempts = tonumber(redis.call('HGET', key_config, 'attempts')) or 1

    local jobAttempts = jobDetails['attempts']
    if jobAttempts < allowedAttempts then
      local priority = jobDetails['priority']
      redis.call('ZADD', key_inactive, priority, jobId)
      jobDetails['state'] = 'inactive'
      jobDetails['started'] = nil
    else
      redis.call('ZADD', key_failed, timestamp, jobId)
      jobDetails['state'] = 'failed'
      jobDetails['error'] = err
      jobDetails['finished'] = timestamp
    end
  end
  fantastiq.setJobDetails(key_jobDetails, jobId, jobDetails)
else
  return redis.error_reply('Job not found')
end
