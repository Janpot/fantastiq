local key_active,
      key_destination,
      key_jobState,
      key_jobError,
      key_jobResult,
      key_jobFinished = unpack(KEYS)

local timestamp,
      jobId,
      endState,
      err,
      result = unpack(ARGV)

local keysRemoved = redis.call('ZREM', key_active, jobId)
if keysRemoved == 1 then
  redis.call('ZADD', key_destination, timestamp, jobId)
  redis.call('HSET', key_jobState, jobId, endState)
  redis.call('HSET', key_jobError, jobId, err)
  redis.call('HSET', key_jobResult, jobId, result)
  redis.call('HSET', key_jobFinished, jobId, timestamp)
else
  return redis.error_reply('Job not found')
end
