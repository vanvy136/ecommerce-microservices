
const axios = require("axios");

class CustomerClient {
    constructor() {
        this.baseUrl = process.env.CUSTOMER_SERVICE_URL;
        this.internalKey = process.env.INTERNAL_SERVICE_KEY;
    }

    async getLoyalty(authUserId) {
        if (!this.baseUrl || !this.internalKey) {
            throw new Error("Customer Service configuration missing");
        }

        const response = await axios.get(
            `${this.baseUrl}/internal/customers/${encodeURIComponent(authUserId)}/loyalty`,
            {
                headers: {
                    "x-internal-service-key": this.internalKey
                },
                timeout: 5000
            }
        );

        if (!response.data?.success || !response.data?.data) {
            throw new Error("Invalid Customer Service response");
        }

        return response.data.data;
    }
}

module.exports = CustomerClient;
