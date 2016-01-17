local ttl = redis.call('PTTL', ARGV[1])
redis.call('HSET', KEYS[1], ARGV[1], ttl)
return redis.call('DEL', ARGV[1])
