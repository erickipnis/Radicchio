local data = redis.call('HGET', KEYS[2], ARGV[1])
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('HDEL', KEYS[2], ARGV[1])
redis.call('DEL', ARGV[1])

if (data == nil) then
  return 'nil'
else
  return data
end
