local fantastiq = (function ()
  local exports = {}

  function exports.map(func, array)
    local new_array = {}
    for i,v in ipairs(array) do
      new_array[i] = func(v)
    end
    return new_array
  end



  -- use more space friendly encoding/decoding than json
  local function encodeDetails(rawJobDetails)
    return cjson.encode(rawJobDetails)
  end

  local function decodeDetails(rawJobDetails)
    if not rawJobDetails then
      return nil
    end
    return cjson.decode(rawJobDetails)
  end



  function exports.detailsToJson(rawJobDetails)
    return cjson.encode(decodeDetails(rawJobDetails))
  end

  function exports.getJobDetails(key_jobDetails, jobId)
    local value = redis.call('HGET', key_jobDetails, jobId)
    if not value then
      return {}
    end
    return decodeDetails(value)
  end

  function exports.setJobDetails(key_jobDetails, jobId, details)
    redis.call('HSET', key_jobDetails, jobId, encodeDetails(details))
  end



  function exports.acknowledge(
    key_inactive, key_active, key_failed, key_completed, key_delayed,
    key_jobDetails, key_config, key_index, timestamp, jobId, err, result)

    local keysRemoved = redis.call('ZREM', key_active, jobId)
    if keysRemoved == 1 then
      local jobDetails = exports.getJobDetails(key_jobDetails, jobId)
      if err == 'null' then
        redis.call('ZADD', key_completed, timestamp, jobId)
        jobDetails['state'] = 'completed'
        jobDetails['result'] = result
        jobDetails['finished'] = timestamp
        redis.call('HDEL', key_index, jobDetails['data'])
      else
        local allowedAttempts = tonumber(redis.call('HGET', key_config, 'attempts')) or 1

        local jobAttempts = jobDetails['attempts']
        if jobAttempts < allowedAttempts then
          local backoff = tonumber(redis.call('HGET', key_config, 'backoff'))

          if backoff then
            local runAt = timestamp + backoff
            redis.call('ZADD', key_delayed, runAt, jobId)
            jobDetails['state'] = 'delayed'
            jobDetails['runAt'] = runAt
          else
            local priority = jobDetails['priority']
            redis.call('ZADD', key_inactive, priority, jobId)
            jobDetails['state'] = 'inactive'
          end
          jobDetails['started'] = nil
        else
          redis.call('ZADD', key_failed, timestamp, jobId)
          jobDetails['state'] = 'failed'
          jobDetails['error'] = err
          jobDetails['finished'] = timestamp
          redis.call('HDEL', key_index, jobDetails['data'])
        end
      end
      exports.setJobDetails(key_jobDetails, jobId, jobDetails)
    else
      return redis.error_reply('Job not found')
    end
  end


  return exports
end)()
