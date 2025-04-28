import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderPaginationDto } from './dto/order.pagination.dto';
import { StatusDto } from './dto/status.dto';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @MessagePattern('createOrder')
  create(@Payload() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(createOrderDto);
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
}
