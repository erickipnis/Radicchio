redis.call('HDEL', KEYS[1], ARGV[1])
return redis.call('DEL', ARGV[1])
