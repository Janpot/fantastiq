local key_state = unpack(KEYS)

local timestamp,
      count,
      order,
      startId = unpack(ARGV)


local start = 0
local command

if order == 'asc' then
  command = 'ZRANGE'
  if startId ~= '' then
    startId = unpack(redis.call('ZRANGEBYLEX', key_state, '[' .. startId, '+', 'LIMIT', 0, 1))
    if startId then
      start = redis.call('ZRANK', key_state, startId)
    else
      return {}
    end
  end
else
  command = 'ZREVRANGE'
  if startId ~= '' then
    startId = unpack(redis.call('ZREVRANGEBYLEX', key_state, '[' .. startId, '-', 'LIMIT', 0, 1))
    if startId then
      start = redis.call('ZREVRANK', key_state, startId)
    else
      return {}
    end
  end
end

local stop = start + count - 1

return redis.call(command, key_state, start, stop)
