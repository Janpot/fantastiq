local key_inactive,
      key_active,
      key_failed,
      key_completed,
      key_jobPriority,
      key_jobState,
      key_jobError,
      key_jobResult,
      key_jobStarted,
      key_jobFinished,
      key_config,
      key_jobAttempts = unpack(KEYS)

local timestamp,
      jobId,
      err,
      result = unpack(ARGV)

local keysRemoved = redis.call('ZREM', key_active, jobId)
if keysRemoved == 1 then
  if err == 'null' then
    redis.call('ZADD', key_completed, timestamp, jobId)
    redis.call('HSET', key_jobState, jobId, 'completed')
    redis.call('HSET', key_jobResult, jobId, result)
    redis.call('HSET', key_jobFinished, jobId, timestamp)
  else
    local allowedAttempts = tonumber(redis.call('HGET', key_config, 'attempts')) or 1
    local jobAttempts = tonumber(redis.call('HGET', key_jobAttempts, jobId))
    if jobAttempts < allowedAttempts then
      local priority = tonumber(redis.call('HGET', key_jobPriority, jobId))
      redis.call('ZADD', key_inactive, priority, jobId)
      redis.call('HSET', key_jobState, jobId, 'inactive')
      redis.call('HDEL', key_jobStarted, jobId)
    else
      redis.call('ZADD', key_failed, timestamp, jobId)
      redis.call('HSET', key_jobState, jobId, 'failed')
      redis.call('HSET', key_jobError, jobId, err)
      redis.call('HSET', key_jobFinished, jobId, timestamp)
    end
  end
else
  return redis.error_reply('Job not found')
end
