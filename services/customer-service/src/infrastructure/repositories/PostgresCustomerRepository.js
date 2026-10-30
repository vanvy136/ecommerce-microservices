const CustomerRepository = require("../../domain/repositories/CustomerRepository");
const Customer = require("../../domain/entities/Customer");
const pool = require("../database/postgres");

class PostgresCustomerRepository extends CustomerRepository {

    mapToEntity(row) {
        if (!row) return null;

        return new Customer({
            id: row.id,
            authUserId: row.auth_user_id,
            fullName: row.full_name,
            phone: row.phone,
            loyaltyPoints: row.loyalty_points,
            membershipTier: row.membership_tier,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        });
    }

    async create(customer) {
        const result = await pool.query(
            `INSERT INTO customers
             (auth_user_id, full_name, phone, loyalty_points, membership_tier)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [
                customer.authUserId,
                customer.fullName,
                customer.phone,
                customer.loyaltyPoints,
                customer.membershipTier
            ]
        );

        return this.mapToEntity(result.rows[0]);
    }

    async findById(id) {
        const result = await pool.query(
            "SELECT * FROM customers WHERE id = $1",
            [id]
        );

        return this.mapToEntity(result.rows[0]);
    }

    async findByAuthUserId(authUserId) {
        const result = await pool.query(
            "SELECT * FROM customers WHERE auth_user_id = $1",
            [authUserId]
        );

        return this.mapToEntity(result.rows[0]);
    }

    async update(customer) {
        const result = await pool.query(
            `UPDATE customers
             SET full_name = $1,
                 phone = $2,
                 loyalty_points = $3,
                 membership_tier = $4,
                 updated_at = NOW()
             WHERE id = $5
             RETURNING *`,
            [
                customer.fullName,
                customer.phone,
                customer.loyaltyPoints,
                customer.membershipTier,
                customer.id
            ]
        );

        return this.mapToEntity(result.rows[0]);
    }
}

module.exports = PostgresCustomerRepository;