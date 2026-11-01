
const axios = require("axios");

class StockReservationClient {
  constructor() {
    this.baseUrl = process.env.PRODUCT_SERVICE_URL;
    this.internalKey = process.env.INTERNAL_SERVICE_KEY;
  }

  getConfig() {
    if (!this.baseUrl || !this.internalKey) {
      throw new Error(
        "Product Service internal configuration is missing"
      );
    }

    return {
      headers: {
        "x-internal-service-key": this.internalKey
      },
      timeout: 5000
    };
  }

  async reserve({
    reservationId,
    orderId,
    productId,
    quantity
  }) {
    const response = await axios.post(
      `${this.baseUrl}/internal/stock/reserve`,
      {
        reservationId,
        orderId,
        productId,
        quantity
      },
      this.getConfig()
    );

    const reservation = response.data?.data;

    if (
      !response.data?.success ||
      reservation?.reservationId !== reservationId ||
      reservation?.orderId !== orderId ||
      String(reservation?.productId) !== String(productId) ||
      reservation?.quantity !== quantity ||
      reservation?.status !== "reserved"
    ) {
      throw new Error(
        "Unexpected stock reservation response"
      );
    }

    return reservation;
  }

  async commit(reservationId) {
    const response = await axios.post(
      `${this.baseUrl}/internal/stock/commit`,
      { reservationId },
      this.getConfig()
    );

    const reservation = response.data?.data;

    if (
      !response.data?.success ||
      reservation?.reservationId !== reservationId ||
      reservation?.status !== "committed"
    ) {
      throw new Error(
        "Unexpected stock commit response"
      );
    }

    return reservation;
  }

  async release(reservationId) {
    const response = await axios.post(
      `${this.baseUrl}/internal/stock/release`,
      { reservationId },
      this.getConfig()
    );

    const reservation = response.data?.data;

    if (
      !response.data?.success ||
      reservation?.reservationId !== reservationId ||
      reservation?.status !== "released"
    ) {
      throw new Error(
        "Unexpected stock release response"
      );
    }

    return reservation;
  }

  async getReservation(reservationId) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/internal/stock/reservations/${encodeURIComponent(reservationId)}`,
        this.getConfig()
      );

      const reservation = response.data?.data;

      if (
        !response.data?.success ||
        reservation?.reservationId !== reservationId
      ) {
        throw new Error(
          "Unexpected stock reservation lookup response"
        );
      }

      return reservation;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }

      throw error;
    }
  }
}

module.exports = {
  StockReservationClient
};
