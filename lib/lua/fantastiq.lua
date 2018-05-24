local fantastiq = (function ()
  local key_inactive,
        key_active,
        key_failed,
        key_completed,
        key_delayed,
        key_jobDetails,
        key_config,
        channel_events = unpack(KEYS)

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


  function exports.emitUpdate(jobId, oldState, newState)
    redis.call('PUBLISH', channel_events, cjson.encode({
      id = jobId,
      oldState = oldState,
      newState = newState
    }))
  end


  function exports.updateJobState(jobDetails, newState)
    local jobId = jobDetails['id']
    local oldState = jobDetails['state']
    local score
    if newState == 'inactive' then
      score = jobDetails['priority']
    elseif newState == 'active' then
      score = jobDetails['started']
    elseif newState == 'completed' or newState == 'failed' then
      score = jobDetails['finished']
    elseif newState == 'delayed' then
      score = jobDetails['runAt']
    end
    if oldState then
      redis.call('ZREM', getKeyForState(oldState), jobId)
    end
    redis.call('ZADD', getKeyForState(newState), score, jobId)
    jobDetails['state'] = newState
    exports.emitUpdate(jobId, oldState, newState)
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
      if jobDetails['key'] then
        redis.call('HDEL', key_index, jobDetails['key'])
      end
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
        if jobDetails['key'] then
          redis.call('HDEL', key_index, jobDetails['key'])
        end
        exports.updateJobState(jobDetails, 'failed')
      end
    end
    exports.setJobDetails(jobId, jobDetails)
  end


  return exports
end)()
