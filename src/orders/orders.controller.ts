import { Controller } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderPaginationDto } from './dto/order.pagination.dto';
import { StatusDto } from './dto/status.dto';
import { PaidOrderDto } from './dto/paid-order.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  async create(@Payload() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);

    const paymentSession = await this.ordersService.createPaymentSession( order );

    return {
      order,
      paymentSession
    }
  }

  @MessagePattern('findAllOrders')
  findAll(
    @Payload() orderPaginationDto: OrderPaginationDto
  ) {
    return this.ordersService.findAll(orderPaginationDto);
  }

  @MessagePattern('findOneOrder')
  findOne(@Payload('id') id: string ) {
    return this.ordersService.findOne( id );
  }

  @MessagePattern('changeOrderStatus')
  changeOrderStatus(
    @Payload() statusDto: StatusDto
  ) {
    return this.ordersService.changeStatus(statusDto);
  }

  @EventPattern('payment.succeeded')
  paidOrder( @Payload() paidOrderDto: PaidOrderDto ) {
    return this.ordersService.paidOrder( paidOrderDto );
  }

}
