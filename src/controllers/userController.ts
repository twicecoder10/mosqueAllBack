import { Request, Response } from 'express';
import { UserService } from '../services/userService';
import { asyncHandler } from '../middleware/errorHandler';
import { UpdateUserDto, UserQuery, InviteUserDto, BulkInviteUserDto } from '../types';

export class UserController {
  // GET /api/users
  static getUsers = asyncHandler(async (req: Request, res: Response) => {
    const query: UserQuery = {
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      role: req.query.role as any,
      isVerified: req.query.isVerified === 'true' ? true : req.query.isVerified === 'false' ? false : undefined,
      search: req.query.search as string
    };

    const result = await UserService.getUsers(query);

    res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: result
    });
  });

  // GET /api/users/:id
  static getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const user = await UserService.getUserById(id);

    res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: user
    });
  });

  // PUT /api/users/:id
  static updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData: UpdateUserDto = req.body;
    const currentUserRole = req.user!.role;
    const currentUserId = req.user!.userId;

    const updatedUser = await UserService.updateUser(id, updateData, currentUserRole, currentUserId);

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  });

  // DELETE /api/users/:id
  static deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const currentUserRole = req.user!.role;
    const currentUserId = req.user!.userId;

    await UserService.deleteUser(id, currentUserRole, currentUserId);

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  });

  // POST /api/users/invite
  static inviteUser = asyncHandler(async (req: Request, res: Response) => {
    const inviteData: InviteUserDto = req.body;
    const currentUserRole = req.user!.role;
    const currentUserId = req.user!.userId;

    const result = await UserService.inviteUser(inviteData, currentUserRole, currentUserId);

    res.status(201).json({
      success: true,
      message: 'User invited successfully',
      data: result
    });
  });

  // POST /api/users/bulk-invite
  static bulkInviteUsers = asyncHandler(async (req: Request, res: Response) => {
    const bulkInviteData: BulkInviteUserDto = req.body;
    const currentUserRole = req.user!.role;
    const currentUserId = req.user!.userId;

    const result = await UserService.bulkInviteUsers(bulkInviteData, currentUserRole, currentUserId);

    res.status(200).json({
      success: true,
      message: 'Bulk invitations processed',
      data: result
    });
  });
}
