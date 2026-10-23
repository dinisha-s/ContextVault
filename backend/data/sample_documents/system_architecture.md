# Distributed Architecture & Caching Strategies

## Overview
Modern web services demand sub-100ms latency at global scale. This document details high-performance patterns across three tiers:
1. Edge CDN routing and static asset distribution.
2. Application gateway load balancing with sticky sessions and circuit-breakers.
3. Multi-level caching strategies combining local in-memory L1 (LRU cache) and distributed L2 (Redis Cluster).

## Caching Invalidation Patterns
- **Cache-Aside (Lazy Loading)**: Application reads from cache first; on cache miss, reads from database, updates cache, and returns data. High resilience, but potential for stale reads on writes.
- **Write-Through**: Application writes data to the cache and the cache writes synchronously to the database. Eliminates stale data at the cost of higher write latency.
- **Write-Behind (Write-Back)**: Writes are acknowledged immediately in cache and asynchronously batched to disk/database. High throughput, but risk of data loss if cache nodes crash before flush.

## Database Sharding vs Partitioning
Vertical partitioning splits columns into dedicated tables, while horizontal sharding distributes rows across database nodes according to a consistent hash ring. Consistent hashing minimizes key remapping when scaling cluster nodes up or down.
