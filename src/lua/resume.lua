local ttl = redis.call('HGET', KEYS[1], ARGV[1])
return redis.call('PSETEX', ARGV[1], ttl, '')
