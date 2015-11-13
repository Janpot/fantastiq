local fantastiq = (function ()
  local key_inactive,
        key_active,
        key_failed,
        key_completed,
        key_delayed,
        key_jobDetails,
        key_config = unpack(KEYS)

  local exports = {
    key_inactive = key_inactive,
    key_active = key_active,
    key_failed = key_failed,
    key_completed = key_completed,
    key_delayed = key_delayed,
    key_jobDetails = key_jobDetails,
    key_config = key_config
  }

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

  function exports.getJobDetails(jobId)
    local value = redis.call('HGET', key_jobDetails, jobId)
    if not value then
      return nil
    end
    return decodeDetails(value)
  end

  function exports.setJobDetails(jobId, details)
    redis.call('HSET', key_jobDetails, jobId, encodeDetails(details))
  end


  function exports.getConfig(key)
    local value = redis.call('HGET', key_config, key)
    if not value then
      return value
    end
    return cjson.decode(value)
  end


  local function getKeyForState(state)
    if state == 'inactive' then
      return key_inactive
    elseif state == 'active' then
      return key_active
    elseif state == 'completed' then
      return key_completed
    elseif state == 'failed' then
      return key_failed
    elseif state == 'delayed' then
      return key_delayed
    else
      return nil
    end
  end


  function exports.updateJobState(jobDetails, state)
    local jobId = jobDetails['id']
    local oldState = jobDetails['state']

    if state then
      local score
      if state == 'inactive' then
        score = jobDetails['priority']
      elseif state == 'active' then
        score = jobDetails['started']
      elseif state == 'completed' or state == 'failed' then
        score = jobDetails['finished']
      elseif state == 'delayed' then
        score = jobDetails['runAt']
      end
      redis.call('ZREM', getKeyForState(oldState), jobId)
      redis.call('ZADD', getKeyForState(state), score, jobId)
      jobDetails['state'] = state
    end
  end


  function exports.acknowledge(key_index, timestamp, jobId, err, result)
    local isActive = redis.call('ZSCORE', key_active, jobId)
    if not isActive then
      return redis.error_reply('Job not found')
    end

    local jobDetails = exports.getJobDetails(jobId)
    if err == 'null' then
      jobDetails['result'] = result
      jobDetails['finished'] = timestamp
      redis.call('HDEL', key_index, jobDetails['key'])
      exports.updateJobState(jobDetails, 'completed')
    else
      local allowedAttempts = exports.getConfig('attempts') or 1

      local jobAttempts = jobDetails['attempts']
      if jobAttempts < allowedAttempts then
        local backoff = exports.getConfig('backoff')

        if backoff then
          local runAt = timestamp + backoff
          jobDetails['runAt'] = runAt
          exports.updateJobState(jobDetails, 'delayed')
        else
          local priority = jobDetails['priority']
          exports.updateJobState(jobDetails, 'inactive')
        end
        jobDetails['started'] = nil
      else
        jobDetails['error'] = err
        jobDetails['finished'] = timestamp
        redis.call('HDEL', key_index, jobDetails['key'])
        exports.updateJobState(jobDetails, 'failed')
      end
    end
    exports.setJobDetails(jobId, jobDetails)
  end


  return exports
end)()
