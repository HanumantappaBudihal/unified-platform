'use strict';

const { Kafka } = require('kafkajs');
const config = require('../config');

// Provisions per-app Kafka topics. Each app gets `events` and `commands`
// streams, each paired with a dead-letter topic, all namespaced under
// `<env>.<slug>` so apps and environments never collide on the shared cluster.

const STREAMS = ['events', 'commands'];
const WEEK_MS = '604800000'; // 7d
const MONTH_MS = '2592000000'; // 30d

function admin() {
  return new Kafka({ clientId: 'provisioning-service', brokers: config.kafka.brokers }).admin();
}

function topicsFor(prefix) {
  return STREAMS.flatMap((name) => [
    {
      topic: `${prefix}.${name}`,
      numPartitions: 3,
      replicationFactor: 1,
      configEntries: [{ name: 'retention.ms', value: WEEK_MS }],
    },
    {
      topic: `${prefix}.${name}.dlq`,
      numPartitions: 1,
      replicationFactor: 1,
      configEntries: [{ name: 'retention.ms', value: MONTH_MS }],
    },
  ]);
}

async function provision(slug, environment) {
  const prefix = `${environment}.${slug}`;
  const topics = topicsFor(prefix);
  const client = admin();
  try {
    await client.connect();
    await client.createTopics({ topics, waitForLeaders: true });
    return {
      config: { topicPrefix: prefix, topics: topics.map((t) => t.topic) },
      credentials: { topicPrefix: prefix, brokers: config.kafka.brokers.join(',') },
    };
  } finally {
    await client.disconnect();
  }
}

async function decommission(slug, environment) {
  const prefix = `${environment}.${slug}`;
  const client = admin();
  try {
    await client.connect();
    const existing = await client.listTopics();
    const toDelete = existing.filter((t) => t === prefix || t.startsWith(`${prefix}.`));
    if (toDelete.length) await client.deleteTopics({ topics: toDelete });
    return { removed: toDelete };
  } finally {
    await client.disconnect();
  }
}

module.exports = { provision, decommission };
