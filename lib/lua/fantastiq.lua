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

  return exports
end)()
