local ttlDel = redis.call('HDEL', KEYS[1], ARGV[1])
local dataDel = redis.call('HDEL', KEYS[2], ARGV[1])

if (ttlDel == 0 and dataDel == 0) then
  return 'nil'
else
  return 'ok'
end
