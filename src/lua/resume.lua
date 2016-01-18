local ttl = redis.call('HGET', KEYS[1], KEYS[2])
redis.call('PSETEX', ARGV[1], ttl, '')
return redis.call('RENAME', ARGV[1], KEYS[2])
