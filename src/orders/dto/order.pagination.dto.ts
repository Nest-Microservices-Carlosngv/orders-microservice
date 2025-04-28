import { IsEnum, IsOptional } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { OrderStatusList } from 'src/orders/enum/order.enum';
import { OrderStatus } from '@prisma/client';

export class OrderPaginationDto extends PaginationDto {

  @IsOptional()
  @IsEnum( OrderStatusList, {
    message: `Order status are ${OrderStatusList}`,
  })
  status?: OrderStatus;

}