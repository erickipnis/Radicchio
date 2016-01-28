local data = redis.call('HGET', KEYS[1], ARGV[1])

if (data == nil) then
  return 'nil'
else
  return data
end
