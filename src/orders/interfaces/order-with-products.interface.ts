import { OrderStatus } from "@prisma/client";

export interface OrderWithProducts {
    OrderItem: {
        name: any;
        productId: number;
        price: number;
        quantity: number;
    }[];
    id: string;
    totalAmount: number;
    totalItems: number;
    status: OrderStatus;
    paid: boolean;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}