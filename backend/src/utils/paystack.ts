import axios from "axios";
import logger from "./logger";

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

interface InitializePaymentData {
    email: string;
    amount: number;
    reference?: string;
    callback_url?: string;
    metadata?: any;
}

interface VerifyPaymentResponse {
    status: boolean;
    message: string;
    data: {
        id: number;
        domain: string;
        status: string;
        reference: string;
        amount: number;
        message: string | null;
        gateway_response: string;
        paid_at: string;
        created_at: string;
        channel: string;
        currency: string;
        ip_address: string;
        metadata: any;
        fees: number;
        customer: {
            id: number;
            first_name: string | null;
            last_name: string | null;
            email: string;
            customer_code: string;
            phone: string | null;
            metadata: any;
            risk_action: string;
        };
        authorization: {
            authorization_code: string;
            bin: string;
            last4: string;
            exp_month: string;
            exp_year: string;
            channel: string;
            card_type: string;
            bank: string;
            country_code: string;
            brand: string;
            reusable: boolean;
            signature: string;
            account_name: string | null;
        };
        plan: any;
    };
}

export class PaystackService {
    private headers: any;
    private isConfigured: boolean;

    constructor() {
        if (!PAYSTACK_SECRET_KEY || PAYSTACK_SECRET_KEY.includes("your_paystack")) {
            logger.warn("Paystack API key not configured. Payment features will not work.");
            this.isConfigured = false;
            this.headers = {};
            return;
        }

        this.isConfigured = true;
        this.headers = {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
        };
    }

    private checkConfiguration() {
        if (!this.isConfigured) {
            throw new Error("Paystack is not configured. Please set PAYSTACK_SECRET_KEY in environment variables.");
        }
    }

    async initializePayment(data: InitializePaymentData) {
        this.checkConfiguration();
        try {
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transaction/initialize`,
                {
                    email: data.email,
                    amount: Math.round(data.amount * 100),
                    reference: data.reference,
                    callback_url: data.callback_url,
                    metadata: data.metadata,
                },
                { headers: this.headers },
            );

            return {
                success: true,
                data: response.data.data,
                authorizationUrl: response.data.data.authorization_url,
                accessCode: response.data.data.access_code,
                reference: response.data.data.reference,
            };
        } catch (error: any) {
            console.error("Paystack initialization error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || "Failed to initialize payment",
            };
        }
    }

    async verifyPayment(reference: string): Promise<VerifyPaymentResponse | null> {
        this.checkConfiguration();
        try {
            const response = await axios.get(
                `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
                { headers: this.headers },
            );

            return response.data;
        } catch (error: any) {
            console.error("Paystack verification error:", error.response?.data || error.message);
            return null;
        }
    }

    async listBanks(country: string = "NG") {
        this.checkConfiguration();
        try {
            const response = await axios.get(
                `${PAYSTACK_BASE_URL}/bank?country=${country}`,
                { headers: this.headers },
            );

            return {
                success: true,
                data: response.data.data,
            };
        } catch (error: any) {
            console.error("Paystack list banks error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || "Failed to fetch banks",
            };
        }
    }

    async createTransferRecipient(data: {
        type: string;
        name: string;
        account_number: string;
        bank_code: string;
        currency?: string;
    }) {
        this.checkConfiguration();
        try {
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transferrecipient`,
                {
                    type: data.type,
                    name: data.name,
                    account_number: data.account_number,
                    bank_code: data.bank_code,
                    currency: data.currency || "NGN",
                },
                { headers: this.headers },
            );

            return {
                success: true,
                data: response.data.data,
            };
        } catch (error: any) {
            console.error("Paystack create recipient error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || "Failed to create transfer recipient",
            };
        }
    }

    async initiateTransfer(data: {
        amount: number;
        recipient: string;
        reason?: string;
        reference?: string;
    }) {
        this.checkConfiguration();
        try {
            const response = await axios.post(
                `${PAYSTACK_BASE_URL}/transfer`,
                {
                    source: "balance",
                    amount: Math.round(data.amount * 100),
                    recipient: data.recipient,
                    reason: data.reason,
                    reference: data.reference,
                },
                { headers: this.headers },
            );

            return {
                success: true,
                data: response.data.data,
            };
        } catch (error: any) {
            console.error("Paystack transfer error:", error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || "Failed to initiate transfer",
            };
        }
    }

    generateReference(): string {
        return `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    }
}

export default new PaystackService();
