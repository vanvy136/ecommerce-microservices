
const { randomUUID } = require("node:crypto");
const UserRepository = require("../../domain/repositories/UserRepository");
const User = require("../../domain/entities/User");
const pool = require("../database/postgres");

class PostgresUserRepository extends UserRepository {
    mapRow(row) {
        if (!row) return null;

        return new User({
            id: row.id,
            email: row.email,
            passwordHash: row.password_hash,
            role: row.role,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }

    async findByEmail(email) {
        const result = await pool.query(
            "SELECT * FROM users WHERE email = $1 LIMIT 1",
            [email.trim().toLowerCase()]
        );

        return this.mapRow(result.rows[0]);
    }

    async findById(id) {
        const result = await pool.query(
            "SELECT * FROM users WHERE id = $1 LIMIT 1",
            [id]
        );

        return this.mapRow(result.rows[0]);
    }

    async save(user) {
        const result = await pool.query(
            `INSERT INTO users (id, email, password_hash, role)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [
                user.id,
                user.email,
                user.passwordHash,
                user.role
            ]
        );

        return this.mapRow(result.rows[0]);
    }

    async saveWithOutbox(user) {
        const client = await pool.connect();

        try {
            await client.query("BEGIN");

            const result = await client.query(
                `INSERT INTO users (id, email, password_hash, role)
                 VALUES ($1, $2, $3, $4)
                 RETURNING *`,
                [
                    user.id,
                    user.email,
                    user.passwordHash,
                    user.role
                ]
            );

            const savedUser = this.mapRow(result.rows[0]);

            const event = {
                eventId: randomUUID(),
                eventType: "UserRegistered",
                userId: savedUser.id,
                fullName: "New Customer",
                email: savedUser.email,
                occurredAt: new Date().toISOString()
            };

            await client.query(
                `INSERT INTO outbox_events (
                    id,
                    aggregate_type,
                    aggregate_id,
                    event_type,
                    payload,
                    status
                )
                VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    event.eventId,
                    "User",
                    savedUser.id,
                    event.eventType,
                    JSON.stringify(event),
                    "PENDING"
                ]
            );

            await client.query("COMMIT");

            return savedUser;
        } catch (error) {
            try {
                await client.query("ROLLBACK");
            } catch (rollbackError) {
                console.error("Rollback failed:", rollbackError);
            }

            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = PostgresUserRepository;
