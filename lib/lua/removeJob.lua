local key_inactive,
      key_active,
      key_completed,
      key_failed,
      key_delayed,
      key_markForDel,
      key_jobDetails = unpack(KEYS)

local timestamp = unpack(ARGV)
local ids = {select(2, unpack(ARGV))}

timestamp = tonumber(timestamp)

local totalRemoved = 0
totalRemoved = totalRemoved + redis.call('ZREM', key_inactive, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_active, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_completed, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_failed, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', key_delayed, unpack(ids))
redis.call('ZREM', key_markForDel, unpack(ids))
redis.call('HDEL', key_jobDetails, unpack(ids))

return totalRemoved
