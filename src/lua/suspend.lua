local ttl = redis.call('PTTL', KEYS[2])
redis.call('HSET', KEYS[1], KEYS[2], ttl)
redis.call('RENAME', KEYS[2], ARGV[1])
return redis.call('DEL', ARGV[1])
