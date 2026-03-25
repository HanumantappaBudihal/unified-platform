# 03 - Kafka UI Management Guide

## Access

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Features Overview

### Dashboard
- Broker count, active controllers, under-replicated partitions
- Online/offline partition count
- Cluster-wide throughput (bytes in/out per second)

### Topics Management
- **View all topics** with partition count, replication factor, message count
- **Create topics** — set name, partitions, replication factor, cleanup policy, retention
- **Delete topics** — remove topics no longer in use
- **Edit topic config** — change retention, segment size, compression, etc.
- **Browse messages** — view messages with filters, search by key/value, offset navigation
- **Produce messages** — send test messages directly from the UI

### Consumer Groups
- **View all consumer groups** and their state (Stable, Rebalancing, Dead)
- **Consumer lag monitoring** — see how far behind each consumer is
- **Reset offsets** — reset consumer group offsets to earliest, latest, or specific offset
- **View members** — see which consumers are assigned to which partitions

### Schema Registry
- **Browse schemas** — view all registered Avro/Protobuf/JSON schemas
- **Schema versions** — see version history and compatibility checks
- **Create schemas** — register new schemas for topics
- **Compare versions** — diff between schema versions

### Kafka Connect (when enabled)
- **View connectors** — list all deployed connectors and their status
- **Create connectors** — deploy new source/sink connectors via the UI
- **Manage connectors** — pause, resume, restart, delete connectors
- **View tasks** — monitor individual connector tasks and errors

### ACLs (Access Control)
- **View ACLs** — see all access control rules
- **Create ACLs** — restrict which applications can read/write to which topics

## Common Operations

### Create a Topic for a New Application
1. Go to **Topics** → **Add a Topic**
2. Name: follow `<domain>.<app>.<event>` convention
3. Partitions: 3 (default) or match expected consumer count
4. Replication Factor: 1 (dev) or 3 (production)
5. Click **Create**

### Monitor Consumer Lag
1. Go to **Consumer Groups**
2. Click on a consumer group
3. View the **Lag** column — this shows messages waiting to be processed
4. If lag is growing, the consumer is slower than the producer

### Browse Messages in a Topic
1. Go to **Topics** → select a topic
2. Click **Messages** tab
3. Use filters to search by key, value content, or offset range
4. Select encoding: String, JSON, Avro, Protobuf

### Reset Consumer Group Offset
1. Go to **Consumer Groups** → select group
2. Click **Reset Offsets**
3. Choose: Earliest, Latest, or specific offset/timestamp
4. Confirm reset

> **Warning:** Resetting offsets will cause the consumer to re-process or skip messages.
