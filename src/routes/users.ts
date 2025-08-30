import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, requireSubAdmin } from '../middleware/auth';
import { validateUserQuery, validateId, validateUpdateUser, validateInviteUser, validateBulkInviteUser } from '../utils/validation';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Admin and Subadmin routes
router.get('/', requireSubAdmin, validateUserQuery, UserController.getUsers);
router.get('/:id', requireSubAdmin, validateId, UserController.getUserById);

// Update user - Allow users to update their own profile, admins/subadmins can update any user
router.put('/:id', validateId, validateUpdateUser, UserController.updateUser);

// Delete user - Only admins/subadmins can delete users
router.delete('/:id', requireSubAdmin, validateId, UserController.deleteUser);

// User invitation routes
router.post('/invite', requireSubAdmin, validateInviteUser, UserController.inviteUser);
router.post('/bulk-invite', requireSubAdmin, validateBulkInviteUser, UserController.bulkInviteUsers);

export default router;
