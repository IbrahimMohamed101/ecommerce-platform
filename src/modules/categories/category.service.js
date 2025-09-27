    const Category = require('./category.model');
    const { ValidationError, NotFoundError } = require('../../utils/errorHandler');
    const logger = require('../../utils/logger');
    const { uploadFromBuffer, deleteImage, getOptimizedUrl } = require('../../utils/cloudinary');

    class CategoryService {

    // Create a new category
    static async createCategory(categoryData, userId) {
        try {
        logger.info('Creating new category', { userId, categoryName: categoryData.name });

        // Validate required fields
        if (!categoryData.name) {
            throw new ValidationError('Category name is required');
        }

        // Check if slug already exists
        if (categoryData.slug) {
            const existingCategory = await Category.findOne({ slug: categoryData.slug });
            if (existingCategory) {
            throw new ValidationError('Category slug already exists');
            }
        }

        // Validate parent category if provided
        if (categoryData.parent) {
            const parentCategory = await Category.findOne({
              _id: categoryData.parent,
              store: categoryData.store
            });
            if (!parentCategory) {
            throw new ValidationError('Parent category not found or not in the same store');
            }
            if (!parentCategory.isActive) {
            throw new ValidationError('Parent category is not active');
            }
        }

        // Create category
        const category = new Category({
            ...categoryData,
            createdBy: userId,
            updatedBy: userId
        });

        const savedCategory = await category.save();

        // Populate parent and ancestors
        await savedCategory.populate([
            { path: 'parent', select: 'name slug' },
            { path: 'ancestors', select: 'name slug' },
            { path: 'createdBy', select: 'firstName lastName email' }
        ]);

        // Update parent category's subcategories count
        if (categoryData.parent) {
            await Category.findByIdAndUpdate(categoryData.parent, {
            $inc: { 'stats.subcategoriesCount': 1 }
            });
        }

        logger.info('Category created successfully', {
            categoryId: savedCategory._id,
            categoryName: savedCategory.name
        });

        return {
            success: true,
            data: savedCategory,
            message: 'Category created successfully'
        };
        } catch (error) {
        logger.error('Failed to create category', {
            userId,
            categoryName: categoryData.name,
            error: error.message
        });
        throw error;
        }
    }

    // Get category by ID
    static async getCategoryById(categoryId, options = {}) {
        try {
        logger.info('Fetching category by ID', { categoryId });

        const query = { _id: categoryId };

        if (!options.includeInactive) {
            query.isActive = true;
        }

        const category = await Category.findOne(query)
            .populate('parent', 'name slug level')
            .populate('ancestors', 'name slug level')
            .populate('createdBy', 'firstName lastName email')
            .populate('updatedBy', 'firstName lastName email');

        if (!category) {
            throw new NotFoundError('Category not found');
        }

        // Increment view count
        if (options.trackViews !== false) {
            category.incrementViewCount().catch(err =>
            logger.error('Failed to increment category view count', { categoryId, error: err.message })
            );
        }

        logger.info('Category fetched successfully', { categoryId, categoryName: category.name });

        return {
            success: true,
            data: category
        };
        } catch (error) {
        logger.error('Failed to fetch category', { categoryId, error: error.message });
        throw error;
        }
    }

    // Get category by slug
    static async getCategoryBySlug(slug, options = {}) {
        try {
        logger.info('Fetching category by slug', { slug });

        const query = { slug };

        if (!options.includeInactive) {
            query.isActive = true;
        }

        const category = await Category.findOne(query)
            .populate('parent', 'name slug level')
            .populate('ancestors', 'name slug level')
            .populate('createdBy', 'firstName lastName email');

        if (!category) {
            throw new NotFoundError('Category not found');
        }

        return {
            success: true,
            data: category
        };
        } catch (error) {
        logger.error('Failed to fetch category by slug', { slug, error: error.message });
        throw error;
        }
    }

    // Update category
    static async updateCategory(categoryId, updateData, userId) {
        try {
        logger.info('Updating category', { categoryId, userId });
        logger.info('updateData received:', updateData);

        const category = await Category.findById(categoryId);
        if (!category) {
            throw new NotFoundError('Category not found');
        }
        logger.info('category fetched:', { id: category._id, slug: category.slug });

        // Check if slug change conflicts
        if (updateData.slug && updateData.slug !== category.slug) {
            const existingCategory = await Category.findOne({ slug: updateData.slug });
            if (existingCategory && existingCategory._id.toString() !== categoryId) {
            throw new ValidationError('Category slug already exists');
            }
        }

        // Validate parent change
        if (updateData.parent !== undefined) {
            if (updateData.parent) {
            // Check if new parent exists, is active, and in the same store
            const newParent = await Category.findOne({
              _id: updateData.parent,
              store: category.store,
              isActive: true
            });
            if (!newParent) {
                throw new ValidationError('Parent category not found, not active, or not in the same store');
            }

            // Prevent circular references
            if (category.ancestors.includes(updateData.parent)) {
                throw new ValidationError('Cannot set descendant as parent (circular reference)');
            }
            }

            // Update subcategories count for old and new parent
            if (category.parent && category.parent.toString() !== updateData.parent) {
            await Category.findByIdAndUpdate(category.parent, {
                $inc: { 'stats.subcategoriesCount': -1 }
            });
            }

            if (updateData.parent && updateData.parent !== category.parent?.toString()) {
            await Category.findByIdAndUpdate(updateData.parent, {
                $inc: { 'stats.subcategoriesCount': 1 }
            });
            }
        }

        // Update category
        Object.assign(category, updateData);
        category.updatedBy = userId;
        category.updatedAt = new Date();

        const updatedCategory = await category.save();

        await updatedCategory.populate([
            { path: 'parent', select: 'name slug' },
            { path: 'ancestors', select: 'name slug' },
            { path: 'updatedBy', select: 'firstName lastName email' }
        ]);

        logger.info('Category updated successfully', {
            categoryId,
            categoryName: updatedCategory.name
        });

        return {
            success: true,
            data: updatedCategory,
            message: 'Category updated successfully'
        };
        } catch (error) {
        logger.error('Failed to update category', { categoryId, error: error.message });
        throw error;
        }
    }

    // Delete category
    static async deleteCategory(categoryId, userId) {
        try {
        logger.info('Deleting category', { categoryId, userId });

        const category = await Category.findById(categoryId);
        if (!category) {
            throw new NotFoundError('Category not found');
        }

        // Check if category has products
        const mongoose = require('mongoose');
        const productCount = await mongoose.model('Product').countDocuments({ category: categoryId });
        if (productCount > 0) {
            throw new ValidationError('Cannot delete category with associated products');
        }

        // Check if category has subcategories
        const subcategoryCount = await Category.countDocuments({ parent: categoryId });
        if (subcategoryCount > 0) {
            throw new ValidationError('Cannot delete category with subcategories');
        }

        await Category.findByIdAndDelete(categoryId);

        // Update parent's subcategories count
        if (category.parent) {
            await Category.findByIdAndUpdate(category.parent, {
            $inc: { 'stats.subcategoriesCount': -1 }
            });
        }

        logger.info('Category deleted successfully', {
            categoryId,
            categoryName: category.name
        });

        return {
            success: true,
            message: 'Category deleted successfully'
        };
        } catch (error) {
        logger.error('Failed to delete category', { categoryId, error: error.message });
        throw error;
        }
    }

    // Get categories with filtering and pagination
    static async getCategories(filters = {}, options = {}) {
        try {
        logger.info('Fetching categories with filters', { filters, options });

        const {
            page = 1,
            limit = 20,
            sort = 'displayOrder',
            includeInactive = false
        } = options;

        const query = {};

        // Store filter
        if (filters.store) {
            query.store = filters.store;
        }

        // Status filter
        if (!includeInactive) {
            query.isActive = true;
        } else if (filters.status) {
            query.status = filters.status;
        }

        // Parent filter
        if (filters.parent !== undefined) {
            query.parent = filters.parent;
        }

        // Level filter
        if (filters.level) {
            query.level = filters.level;
        }

        // Featured filter
        if (filters.featured === 'true') {
            query.isFeatured = true;
        }

        // Search filter
        if (filters.search) {
            query.$or = [
            { name: { $regex: filters.search, $options: 'i' } },
            { description: { $regex: filters.search, $options: 'i' } }
            ];
        }

        const skip = (page - 1) * limit;

        // Build sort object
        let sortObj = {};
        if (sort.startsWith('-')) {
            sortObj[sort.substring(1)] = -1;
        } else {
            sortObj[sort] = 1;
        }

        const categories = await Category.find(query)
            .populate('parent', 'name slug')
            .sort(sortObj)
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Category.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        logger.info('Categories fetched successfully', {
            count: categories.length,
            total,
            page,
            limit
        });

        return {
            success: true,
            data: categories,
            pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1
            }
        };
        } catch (error) {
        logger.error('Failed to fetch categories', { filters, error: error.message });
        throw error;
        }
    }

    // Get category tree
    static async getCategoryTree(options = {}) {
        try {
        logger.info('Fetching category tree');

        const tree = await Category.getCategoryTree(options.store);

        // Apply options
        if (options.maxLevel) {
            // Filter tree to max level
            const filterByLevel = (categories, maxLevel) => {
            return categories
                .filter(cat => cat.level <= maxLevel)
                .map(cat => ({
                ...cat,
                children: filterByLevel(cat.children, maxLevel)
                }));
            };
            tree = filterByLevel(tree, options.maxLevel);
        }

        return {
            success: true,
            data: tree
        };
        } catch (error) {
        logger.error('Failed to fetch category tree', { error: error.message });
        throw error;
        }
    }

    // Get root categories
    static async getRootCategories(options = {}) {
        try {
        const categories = await Category.findRootCategories(options.store);

        if (options.includeStats) {
            // Add statistics for each category
            for (const category of categories) {
            await category.updateProductCount();
            await category.updateSubcategoriesCount();
            }
        }

        return {
            success: true,
            data: categories
        };
        } catch (error) {
        logger.error('Failed to fetch root categories', { error: error.message });
        throw error;
        }
    }

    // Get subcategories
    static async getSubcategories(parentId, options = {}) {
        try {
        const categories = await Category.findSubcategories(parentId, options.store);

        if (options.includeStats) {
            for (const category of categories) {
            await category.updateProductCount();
            }
        }

        return {
            success: true,
            data: categories
        };
        } catch (error) {
        logger.error('Failed to fetch subcategories', { parentId, error: error.message });
        throw error;
        }
    }

    // Search categories
    static async searchCategories(searchTerm, storeId) {
        try {
        logger.info('Searching categories', { searchTerm, storeId });

        const categories = await Category.search(searchTerm, storeId);

        return {
            success: true,
            data: categories,
            searchTerm
        };
        } catch (error) {
        logger.error('Failed to search categories', { searchTerm, error: error.message });
        throw error;
        }
    }

    // Bulk update categories
    static async bulkUpdateCategories(categoryIds, updateData, userId) {
        try {
        logger.info('Bulk updating categories', { categoryIds: categoryIds.length, userId });

        const query = { _id: { $in: categoryIds } };
        const updates = {
            ...updateData,
            updatedBy: userId,
            updatedAt: new Date()
        };

        // Remove fields that shouldn't be bulk updated
        const restrictedFields = ['_id', 'slug', 'parent', 'ancestors', 'level', 'createdBy', 'createdAt'];
        restrictedFields.forEach(field => delete updates[field]);

        const result = await Category.updateMany(query, updates);

        logger.info('Bulk update completed', {
            matched: result.matchedCount,
            modified: result.modifiedCount
        });

        return {
            success: true,
            data: {
            matched: result.matchedCount,
            modified: result.modifiedCount
            },
            message: `Updated ${result.modifiedCount} categories successfully`
        };
        } catch (error) {
        logger.error('Failed to bulk update categories', { error: error.message });
        throw error;
        }
    }

    // Update category statistics
    static async updateCategoryStats(categoryId) {
        try {
        const category = await Category.findById(categoryId);
        if (!category) {
            throw new NotFoundError('Category not found');
        }

        await category.updateProductCount();
        await category.updateSubcategoriesCount();

        return {
            success: true,
            data: category.stats,
            message: 'Category statistics updated successfully'
        };
        } catch (error) {
        logger.error('Failed to update category stats', { categoryId, error: error.message });
        throw error;
        }
    }

    // Get featured categories
    static async getFeaturedCategories(options = {}) {
        try {
        const categories = await Category.findFeatured(options.store);

        if (options.includeStats) {
            for (const category of categories) {
            await category.updateProductCount();
            }
        }

        return {
            success: true,
            data: categories
        };
        } catch (error) {
        logger.error('Failed to fetch featured categories', { error: error.message });
        throw error;
        }
    }

    // Upload category image
    static async uploadCategoryImage(categoryId, imageUrl, altText = '', userId) {
        try {
        logger.info('Uploading category image', { categoryId, userId });

        const category = await Category.findById(categoryId);
        if (!category) {
            throw new NotFoundError('Category not found');
        }

        // Delete existing image if present
        if (category.image && category.image.url) {
            try {
            const publicId = category.image.url.split('/').pop().split('.')[0];
            await deleteImage(`ecommerce-platform/${publicId}`);
            } catch (deleteError) {
            logger.warn('Failed to delete old category image', { categoryId, error: deleteError.message });
            }
        }

        // Extract public ID from Cloudinary URL
        const publicId = imageUrl.split('/').pop().split('.')[0];

        // Update category with new image
        category.image = {
            url: imageUrl,
            alt: altText || category.name
        };

        category.updatedBy = userId;
        category.updatedAt = new Date();

        await category.save();

        logger.info('Category image uploaded successfully', {
            categoryId,
            imageUrl: category.image.url
        });

        return {
            success: true,
            data: {
            image: category.image,
            publicId: publicId
            },
            message: 'Category image uploaded successfully'
        };
        } catch (error) {
        logger.error('Failed to upload category image', { categoryId, error: error.message });
        throw error;
        }
    }

    // Delete category image
    static async deleteCategoryImage(categoryId, userId) {
        try {
        logger.info('Deleting category image', { categoryId, userId });

        const category = await Category.findById(categoryId);
        if (!category) {
            throw new NotFoundError('Category not found');
        }

        if (!category.image || !category.image.url) {
            throw new ValidationError('Category has no image to delete');
        }

        // Delete from Cloudinary
        const publicId = category.image.url.split('/').pop().split('.')[0];
        await deleteImage(`ecommerce-platform/${publicId}`);

        // Remove image from category
        category.image = undefined;
        category.updatedBy = userId;
        category.updatedAt = new Date();

        await category.save();

        logger.info('Category image deleted successfully', { categoryId });

        return {
            success: true,
            message: 'Category image deleted successfully'
        };
        } catch (error) {
        logger.error('Failed to delete category image', { categoryId, error: error.message });
        throw error;
        }
    }
    }

    module.exports = CategoryService;