local timestamp = unpack(ARGV)
local ids = {select(2, unpack(ARGV))}

local values = redis.call('HMGET', fantastiq.key_jobDetails, unpack(ids)) or {}


return fantastiq.map(fantastiq.detailsToJson, values)
