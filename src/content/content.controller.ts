import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserJwtAuthGuard } from '@/user-auth/guard/user-jwt-auth.guard';
import { ActiveUserGuard } from '@/user-auth/guard/user-status.guard';
import { CursorPaginationDto } from '@/common/dto/cursor-pagination.dto';
import { ContentService } from './content.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PostResponseDto } from './dto/post-response.dto';
import { MyPostResponseDto } from './dto/my-post-response.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import {
  mapPostFeedItemToDto,
  mapPostWithDetailsToDto,
  mapMyPostToDto,
  mapCommentToDto,
} from './content.mapper';

@ApiTags('Content')
@Controller('posts')
@UseGuards(UserJwtAuthGuard, ActiveUserGuard)
@ApiBearerAuth()
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('feed')
  @ApiOperation({ summary: 'Get posts feed from approved connections' })
  @ApiOkResponse({ description: 'Paginated list of posts' })
  async getFeed(
    @Query() query: CursorPaginationDto,
  ): Promise<{ posts: PostResponseDto[]; nextCursor: string | null }> {
    const result = await this.contentService.getFeed(query.cursor, query.limit);
    return {
      posts: result.posts.map(mapPostFeedItemToDto),
      nextCursor: result.nextCursor,
    };
  }

  @Get('my')
  @ApiOperation({ summary: 'Get own posts' })
  @ApiOkResponse({ description: 'Paginated list of own posts' })
  async getMyPosts(
    @Query() query: CursorPaginationDto,
  ): Promise<{ posts: MyPostResponseDto[]; nextCursor: string | null }> {
    const result = await this.contentService.getMyPosts(
      query.cursor,
      query.limit,
    );
    return {
      posts: result.posts.map(mapMyPostToDto),
      nextCursor: result.nextCursor,
    };
  }

  @Get(':postId')
  @ApiOperation({ summary: 'Get post by ID' })
  @ApiOkResponse({ type: PostResponseDto })
  async getPostById(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<PostResponseDto> {
    const post = await this.contentService.getPostById(postId);
    return mapPostWithDetailsToDto(post);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiCreatedResponse({ type: PostResponseDto })
  async createPost(@Body() dto: CreatePostDto): Promise<PostResponseDto> {
    const post = await this.contentService.createPost(dto.text, dto.imageUrls);
    return mapPostWithDetailsToDto(post);
  }

  @Patch(':postId')
  @ApiOperation({ summary: 'Update post (own posts only)' })
  @ApiOkResponse({ type: PostResponseDto })
  async updatePost(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: UpdatePostDto,
  ): Promise<PostResponseDto> {
    const post = await this.contentService.updatePost(
      postId,
      dto.text,
      dto.imageUrls,
    );
    return mapPostWithDetailsToDto(post);
  }

  @Delete(':postId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete post (own posts only)' })
  @ApiNoContentResponse()
  async deletePost(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<void> {
    await this.contentService.deletePost(postId);
  }

  @Post(':postId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Like a post' })
  @ApiNoContentResponse()
  async likePost(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<void> {
    await this.contentService.likePost(postId);
  }

  @Delete(':postId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike a post' })
  @ApiNoContentResponse()
  async unlikePost(
    @Param('postId', ParseUUIDPipe) postId: string,
  ): Promise<void> {
    await this.contentService.unlikePost(postId);
  }

  @Get(':postId/comments')
  @ApiOperation({ summary: 'Get comments on a post' })
  @ApiOkResponse({ description: 'Paginated list of comments' })
  async getComments(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() query: CursorPaginationDto,
  ): Promise<{ comments: CommentResponseDto[]; nextCursor: string | null }> {
    const result = await this.contentService.getComments(
      postId,
      query.cursor,
      query.limit,
    );
    return {
      comments: result.comments.map(mapCommentToDto),
      nextCursor: result.nextCursor,
    };
  }

  @Post(':postId/comments')
  @ApiOperation({ summary: 'Create a comment on a post' })
  @ApiCreatedResponse({ type: CommentResponseDto })
  async createComment(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.contentService.createComment(postId, dto.text);
    return mapCommentToDto(comment);
  }

  @Patch(':postId/comments/:commentId')
  @ApiOperation({ summary: 'Update comment (own comments only)' })
  @ApiOkResponse({ type: CommentResponseDto })
  async updateComment(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.contentService.updateComment(
      commentId,
      dto.text,
    );
    return mapCommentToDto(comment);
  }

  @Delete(':postId/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete comment (own comments only)' })
  @ApiNoContentResponse()
  async deleteComment(
    @Param('postId', ParseUUIDPipe) postId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ): Promise<void> {
    await this.contentService.deleteComment(commentId);
  }
}
