local key_markForDel,
      key_index = unpack(KEYS)

local timestamp = unpack(ARGV)
local ids = {select(2, unpack(ARGV))}

timestamp = tonumber(timestamp)

local totalRemoved = 0
totalRemoved = totalRemoved + redis.call('ZREM', fantastiq.key_inactive, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', fantastiq.key_active, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', fantastiq.key_completed, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', fantastiq.key_failed, unpack(ids))
totalRemoved = totalRemoved + redis.call('ZREM', fantastiq.key_delayed, unpack(ids))
redis.call('ZREM', key_markForDel, unpack(ids))

local uniqueKeys = {}
for i, id in ipairs(ids) do
  local details = fantastiq.getJobDetails(id)
  if details['key'] then
    table.insert(uniqueKeys, details['key'])
  end
end

if #uniqueKeys > 0 then
  redis.call('HDEL', key_index, unpack(uniqueKeys))
end
redis.call('HDEL', fantastiq.key_jobDetails, unpack(ids))

return totalRemoved
